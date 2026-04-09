/**
 * Email notification handler.
 *
 * GET  /api/notify?type=weekly-digest    — Vercel Cron (Monday 08:00 UTC)
 * GET  /api/notify?type=monthly-report   — Vercel Cron (1st of month 08:00 UTC)
 * GET  /api/notify?type=invoice-overdue  — Vercel Cron (daily 09:00 UTC)
 *
 * POST /api/notify  { type: "payment", entry: {...} }
 *   — Called client-side after a successful income entry insert.
 *
 * All GET routes require Authorization: Bearer <CRON_SECRET>.
 * POST "payment" route requires a valid Supabase session cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { formatCurrency } from "@/lib/calculations";

// ── Resend setup ──────────────────────────────────────────────────────────────
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM =
  process.env.RESEND_FROM_EMAIL ?? "MyStackd <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://mystackd.com";

// ── Auth helpers ──────────────────────────────────────────────────────────────
function isCronAuthorized(req: NextRequest): boolean {
  // In development without a configured secret, allow through for easier local testing.
  // In production CRON_SECRET is always required — cron jobs will fail loudly without it.
  if (process.env.NODE_ENV !== "production" && !process.env.CRON_SECRET) {
    return true;
  }
  if (!process.env.CRON_SECRET) {
    console.error("[notify] CRON_SECRET is not set — rejecting cron request");
    return false;
  }
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

// ── Email layout (dark theme, inline styles for email clients) ────────────────
function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#0B0F17;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;background:#0B0F17;">

  <!-- Header -->
  <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #1E2939;">
    <span style="font-size:22px;font-weight:700;color:#22C55E;letter-spacing:-0.5px;">MyStackd</span>
  </div>

  <!-- Title -->
  <h1 style="font-size:20px;font-weight:600;color:#f1f5f9;margin:0 0 20px 0;line-height:1.3;">${title}</h1>

  <!-- Body content -->
  ${body}

  <!-- Footer -->
  <div style="margin-top:36px;padding-top:20px;border-top:1px solid #1E2939;font-size:12px;color:#64748b;line-height:1.6;">
    <p style="margin:0 0 8px 0;">
      You're receiving this because email notifications are enabled in your MyStackd account.
    </p>
    <a href="${APP_URL}/settings#notifications"
       style="color:#22C55E;text-decoration:none;font-weight:500;">
      Manage notification preferences →
    </a>
  </div>

</div>
</body>
</html>`;
}

function statBlock(label: string, value: string, color = "#22C55E"): string {
  return `
    <div style="background:#111827;border:1px solid #1E2939;border-radius:10px;padding:16px 20px;display:inline-block;min-width:140px;margin-bottom:4px;">
      <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">${label}</div>
      <div style="font-size:22px;font-weight:700;color:${color};line-height:1.2;">${value}</div>
    </div>`;
}

function tableRow(label: string, value: string, valueColor = "#e2e8f0"): string {
  return `
    <tr>
      <td style="padding:7px 0;color:#64748b;font-size:13px;width:130px;vertical-align:top;">${label}</td>
      <td style="padding:7px 0;color:${valueColor};font-size:13px;font-weight:500;">${value}</td>
    </tr>`;
}

function ctaButton(text: string, href: string, color = "#22C55E"): string {
  const fg = color === "#22C55E" ? "#0B0F17" : "#ffffff";
  return `
    <a href="${href}"
       style="display:inline-block;background:${color};color:${fg};padding:11px 22px;border-radius:8px;
              text-decoration:none;font-weight:600;font-size:14px;margin-top:20px;">
      ${text}
    </a>`;
}

// ── Handler: new payment received ─────────────────────────────────────────────
interface IncomeEntryPayload {
  id?: string;
  amount: number;
  currency: string;
  source: string;
  date: string;
  note?: string;
  clientName?: string;
}

async function handlePayment(userId: string, entry: IncomeEntryPayload) {
  if (!resend) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
  }

  const db = createServiceClient();

  const { data: profile } = await db
    .from("profiles")
    .select("name, email, currency, notification_prefs")
    .eq("id", userId)
    .single();

  if (!profile) return NextResponse.json({ skipped: "profile not found" });

  const prefs = profile.notification_prefs as Record<string, boolean> ?? {};
  if (!prefs.newPayment) return NextResponse.json({ skipped: "newPayment pref disabled" });

  const currency = (profile.currency as string) ?? "EUR";

  // YTD total (all income entries this calendar year)
  const year = new Date().getFullYear();
  const { data: ytdRows } = await db
    .from("income_entries")
    .select("amount")
    .eq("user_id", userId)
    .gte("date", `${year}-01-01`);

  const ytdTotal = (ytdRows ?? []).reduce(
    (s: number, r: { amount: number }) => s + r.amount,
    0,
  );

  const formattedDate = new Date(entry.date).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  const body = `
    <p style="color:#94a3b8;margin:0 0 24px 0;line-height:1.6;">
      A new payment has landed in your account.
    </p>

    <!-- Stats row -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
      ${statBlock("Amount received", formatCurrency(entry.amount, entry.currency), "#22C55E")}
      ${statBlock("YTD total", formatCurrency(ytdTotal, currency), "#94a3b8")}
    </div>

    <!-- Detail table -->
    <div style="background:#111827;border:1px solid #1E2939;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
      <table style="width:100%;border-collapse:collapse;">
        ${tableRow("Source", entry.source.charAt(0).toUpperCase() + entry.source.slice(1))}
        ${tableRow("Date", formattedDate)}
        ${entry.clientName ? tableRow("Client", entry.clientName) : ""}
        ${entry.note ? tableRow("Note", entry.note) : ""}
      </table>
    </div>

    ${ctaButton("View dashboard →", `${APP_URL}/dashboard`)}
  `;

  await resend.emails.send({
    from: FROM,
    to: profile.email as string,
    subject: `💰 New payment: ${formatCurrency(entry.amount, entry.currency)} from ${entry.source}`,
    html: emailLayout("New payment received", body),
  });

  return NextResponse.json({ sent: true });
}

// ── Handler: weekly / monthly digest ─────────────────────────────────────────
async function handleDigest(period: "weekly" | "monthly") {
  if (!resend) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
  }

  const db = createServiceClient();
  const now = new Date();

  // Date ranges
  let startDate: string;
  let prevStartDate: string;
  let prevEndDate: string;

  if (period === "weekly") {
    const d1 = new Date(now); d1.setDate(d1.getDate() - 7);
    const d2 = new Date(now); d2.setDate(d2.getDate() - 14);
    startDate     = d1.toISOString().split("T")[0];
    prevStartDate = d2.toISOString().split("T")[0];
    prevEndDate   = startDate;
  } else {
    const firstOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfPrevMonth  = new Date(now.getFullYear(), now.getMonth(), 0);
    startDate     = firstOfMonth.toISOString().split("T")[0];
    prevStartDate = firstOfPrevMonth.toISOString().split("T")[0];
    prevEndDate   = lastOfPrevMonth.toISOString().split("T")[0];
  }

  const today = now.toISOString().split("T")[0];
  const prefKey = period === "weekly" ? "weeklyDigest" : "monthlyReport";

  // All users with this notification enabled
  const { data: profiles } = await db
    .from("profiles")
    .select("id, name, email, currency, notification_prefs");

  const eligible = (profiles ?? []).filter(
    (p: { notification_prefs: Record<string, boolean> | null }) =>
      p.notification_prefs?.[prefKey] !== false,
  );

  let sentCount = 0;

  for (const profile of eligible) {
    try {
      const { data: entries } = await db
        .from("income_entries")
        .select("amount, currency, source")
        .eq("user_id", profile.id)
        .gte("date", startDate)
        .lte("date", today);

      const total = (entries ?? []).reduce(
        (s: number, e: { amount: number }) => s + e.amount, 0,
      );
      if (total === 0) continue; // no activity this period — skip

      const { data: prevEntries } = await db
        .from("income_entries")
        .select("amount")
        .eq("user_id", profile.id)
        .gte("date", prevStartDate)
        .lte("date", prevEndDate);

      const prevTotal = (prevEntries ?? []).reduce(
        (s: number, e: { amount: number }) => s + e.amount, 0,
      );

      const { data: ytdEntries } = await db
        .from("income_entries")
        .select("amount")
        .eq("user_id", profile.id)
        .gte("date", `${now.getFullYear()}-01-01`);

      const ytdTotal = (ytdEntries ?? []).reduce(
        (s: number, e: { amount: number }) => s + e.amount, 0,
      );

      // Top 3 sources
      const sourceMap: Record<string, number> = {};
      (entries ?? []).forEach((e: { source: string; amount: number }) => {
        sourceMap[e.source] = (sourceMap[e.source] ?? 0) + e.amount;
      });
      const topSources = Object.entries(sourceMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      const currency = (profile.currency as string) ?? "EUR";
      const change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
      const changeLabel = period === "weekly" ? "vs last week" : "vs last month";
      const changeBadge =
        change !== null
          ? `<span style="display:inline-block;margin-left:8px;font-size:13px;font-weight:600;color:${change >= 0 ? "#22C55E" : "#f87171"}">
               ${change >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(change))}% ${changeLabel}
             </span>`
          : "";

      const periodLabel =
        period === "weekly"
          ? `week ending ${now.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
          : now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

      const sourcesHtml = topSources
        .map(
          ([src, amt]) =>
            `<tr>
              <td style="padding:7px 0;color:#94a3b8;font-size:13px;text-transform:capitalize;">${src}</td>
              <td style="padding:7px 0;color:#e2e8f0;font-size:13px;font-weight:500;text-align:right;">${formatCurrency(amt, currency)}</td>
            </tr>`,
        )
        .join("");

      const subject =
        period === "weekly"
          ? `📊 Weekly digest: ${formatCurrency(total, currency)} earned this week`
          : `📈 Monthly report: ${formatCurrency(total, currency)} in ${now.toLocaleDateString("en-GB", { month: "long" })}`;

      const emailTitle =
        period === "weekly" ? "Your weekly income summary" : "Monthly income report";

      const body = `
        <p style="color:#94a3b8;margin:0 0 24px 0;line-height:1.6;">
          Here's your ${period === "weekly" ? "weekly" : "monthly"} income summary for the ${periodLabel}. ${changeBadge}
        </p>

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
          ${statBlock(period === "weekly" ? "This week" : "This month", formatCurrency(total, currency), "#22C55E")}
          ${statBlock("YTD total", formatCurrency(ytdTotal, currency), "#94a3b8")}
          ${prevTotal > 0 ? statBlock(period === "weekly" ? "Last week" : "Last month", formatCurrency(prevTotal, currency), "#64748b") : ""}
        </div>

        ${
          topSources.length > 0
            ? `<div style="background:#111827;border:1px solid #1E2939;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
                 <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">By source</div>
                 <table style="width:100%;border-collapse:collapse;">${sourcesHtml}</table>
               </div>`
            : ""
        }

        ${ctaButton("Open dashboard →", `${APP_URL}/dashboard`)}
      `;

      await resend.emails.send({
        from: FROM,
        to: profile.email as string,
        subject,
        html: emailLayout(emailTitle, body),
      });

      sentCount++;
    } catch (err) {
      console.error(`[notify] Failed to send ${period} digest to ${profile.email}:`, err);
    }
  }

  return NextResponse.json({ period, sent: sentCount, eligible: eligible.length });
}

// ── Handler: invoice overdue ───────────────────────────────────────────────────
async function handleInvoiceOverdue() {
  if (!resend) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 503 });
  }

  const db = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  // Find all sent invoices past their due date
  const { data: overdueInvoices } = await db
    .from("invoices")
    .select("*")
    .eq("status", "sent")
    .lt("due_date", today);

  if (!overdueInvoices?.length) {
    return NextResponse.json({ sent: 0, updated: 0 });
  }

  let sentCount = 0;
  const updatedIds: string[] = [];

  for (const inv of overdueInvoices) {
    // Mark the invoice as overdue in the database
    await db.from("invoices").update({ status: "overdue" }).eq("id", inv.id);
    updatedIds.push(inv.id as string);

    // Fetch the invoice owner's profile
    const { data: profile } = await db
      .from("profiles")
      .select("name, email, currency, notification_prefs")
      .eq("id", inv.user_id)
      .single();

    if (!profile) continue;

    const prefs = profile.notification_prefs as Record<string, boolean> ?? {};
    if (!prefs.invoiceOverdue) continue;

    const currency = (inv.currency ?? profile.currency ?? "EUR") as string;
    const daysOverdue = Math.floor(
      (Date.now() - new Date(inv.due_date as string).getTime()) / 86_400_000,
    );
    const dueFormatted = new Date(inv.due_date as string).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });

    const body = `
      <p style="color:#94a3b8;margin:0 0 24px 0;line-height:1.6;">
        Invoice <strong style="color:#f1f5f9;">#${inv.invoice_number}</strong> for
        <strong style="color:#f1f5f9;">${inv.client_name}</strong> is now
        <span style="color:#f87171;font-weight:600;">${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue</span>.
        Consider following up with your client.
      </p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
        ${statBlock("Amount due", formatCurrency(inv.total as number, currency), "#f87171")}
        ${statBlock("Days overdue", `${daysOverdue}d`, "#f87171")}
      </div>

      <div style="background:#111827;border:1px solid #1E2939;border-radius:10px;padding:16px 20px;margin-bottom:8px;">
        <table style="width:100%;border-collapse:collapse;">
          ${tableRow("Client", inv.client_name as string)}
          ${tableRow("Invoice #", inv.invoice_number as string)}
          ${tableRow("Due date", dueFormatted, "#f87171")}
          ${tableRow("Amount", formatCurrency(inv.total as number, currency), "#f87171")}
          ${inv.client_email ? tableRow("Client email", inv.client_email as string) : ""}
        </table>
      </div>

      ${ctaButton("View invoices →", `${APP_URL}/invoices`, "#ef4444")}
    `;

    try {
      await resend.emails.send({
        from: FROM,
        to: profile.email as string,
        subject: `⚠️ Invoice overdue: ${inv.client_name} — ${formatCurrency(inv.total as number, currency)}`,
        html: emailLayout("Invoice overdue", body),
      });
      sentCount++;
    } catch (err) {
      console.error(`[notify] Failed to send overdue alert to ${profile.email}:`, err);
    }
  }

  return NextResponse.json({ sent: sentCount, updated: updatedIds.length });
}

// ── Route handlers ────────────────────────────────────────────────────────────

/** GET — called by Vercel Cron, protected by Authorization: Bearer <CRON_SECRET> */
export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = req.nextUrl.searchParams.get("type");

  switch (type) {
    case "weekly-digest":   return handleDigest("weekly");
    case "monthly-report":  return handleDigest("monthly");
    case "invoice-overdue": return handleInvoiceOverdue();
    default:
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
  }
}

/** POST — called client-side after mutations, requires a valid session cookie */
export async function POST(req: NextRequest) {
  const body = await req.json() as { type: string; entry?: IncomeEntryPayload };
  const { type, entry } = body;

  if (type === "payment") {
    if (!entry) {
      return NextResponse.json({ error: "Missing entry" }, { status: 400 });
    }
    // Authenticate from session cookie
    const supabase = await createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return handlePayment(session.user.id, entry);
  }

  return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
}
