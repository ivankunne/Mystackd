import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePro } from "@/lib/api/pro-gate";

interface WebhookRow {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
}

/**
 * SSRF guard — rejects URLs pointing at localhost, private networks, or
 * non-HTTP(S) schemes so an attacker cannot redirect our server to hit
 * internal infrastructure via a user-configured webhook URL.
 */
function isSsrfSafe(rawUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) return false;

  const h = parsed.hostname.toLowerCase();

  // Reject loopback
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return false;

  // Reject private IPv4 ranges
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10) return false;                         // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return false;  // 172.16.0.0/12
    if (a === 192 && b === 168) return false;            // 192.168.0.0/16
    if (a === 169 && b === 254) return false;            // link-local
    if (a === 127) return false;                         // full loopback range
    if (a === 0) return false;                           // 0.x.x.x
    if (a === 100 && b >= 64 && b <= 127) return false;  // CGNAT 100.64.0.0/10
  }

  // Reject .local / .internal / .localhost mDNS / test domains
  if (/\.(local|internal|localhost|test|invalid)$/.test(h)) return false;

  return true;
}

export async function POST(req: NextRequest) {
  // Authenticate from the user's session cookie
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check Pro status — webhooks are Pro-only
  const proCheck = await requirePro(session.user.id, supabase);
  if (proCheck) return proCheck;

  const body = await req.json() as { event: string; payload: Record<string, unknown> };
  const { event, payload } = body;

  if (!event) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  // Load user's active webhooks that subscribe to this event
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("id, url, events, is_active")
    .eq("user_id", session.user.id)
    .eq("is_active", true);

  const matching = (webhooks as WebhookRow[] ?? []).filter(
    (wh) => wh.events.includes(event) && isSsrfSafe(wh.url),
  );

  if (matching.length === 0) {
    return NextResponse.json({ fired: 0 });
  }

  // Fire all matching webhooks concurrently (best-effort, 5 s timeout)
  const results = await Promise.allSettled(
    matching.map(async (wh) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      try {
        const res = await fetch(wh.url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "MyStackd-Webhooks/1.0",
            "X-MyStackd-Event": event,
          },
          body: JSON.stringify({
            event,
            data: payload,
            timestamp: new Date().toISOString(),
          }),
        });
        return { url: wh.url, status: res.status, ok: res.ok };
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  const summary = results.map((r) =>
    r.status === "fulfilled" ? r.value : { status: "error", reason: String((r as PromiseRejectedResult).reason) },
  );

  return NextResponse.json({ fired: matching.length, results: summary });
}
