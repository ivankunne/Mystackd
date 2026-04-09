import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch the invoice — service key bypasses RLS so any client can access their invoice
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !inv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Fetch payment info from the invoice OWNER's profile (not the visitor's session)
  const { data: profile } = await supabase
    .from("profiles")
    .select("payment_info")
    .eq("id", inv.user_id)
    .single();

  const defaultPaymentInfo = {
    accountName: "", bankName: "", iban: "", bic: "",
    paypalEmail: "", wiseEmail: "",
    paymentNotes: "Please include the invoice number as the payment reference.",
  };

  return NextResponse.json({
    invoice:     inv,
    paymentInfo: (profile?.payment_info as Record<string, string> | null) ?? defaultPaymentInfo,
  });
}
