import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify portal exists and is enabled — use the token to scope all mutations
  const { data: portal } = await supabase
    .from("client_portals")
    .select("client_id, user_id")
    .eq("token", token)
    .eq("is_enabled", true)
    .single();

  if (!portal) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { action, id } = body as { action: string; id: string; [k: string]: unknown };

  // ── Accept / decline a proposal ────────────────────────────────────────────
  if (action === "accept_proposal" || action === "decline_proposal") {
    const status = action === "accept_proposal" ? "accepted" : "declined";
    const { data, error } = await supabase
      .from("proposals")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", id)
      .eq("client_id", portal.client_id)   // ensure it belongs to this portal's client
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "update_failed" }, { status: 400 });
    }
    return NextResponse.json(data);
  }

  // ── Sign a contract ────────────────────────────────────────────────────────
  if (action === "sign_contract") {
    const { signerName } = body as { signerName: string };
    if (!signerName?.trim()) {
      return NextResponse.json({ error: "signer_name_required" }, { status: 400 });
    }
    const { data, error } = await supabase
      .from("contracts")
      .update({
        client_signature_name: signerName.trim(),
        client_signed_at:      new Date().toISOString(),
        status:                "signed",
      })
      .eq("id", id)
      .eq("client_id", portal.client_id)
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "update_failed" }, { status: 400 });
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
