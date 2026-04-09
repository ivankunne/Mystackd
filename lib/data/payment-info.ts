import { createClient } from "../supabase/client";

export interface PaymentInfo {
  accountName:  string;
  bankName:     string;
  iban:         string;
  bic:          string;
  paypalEmail:  string;
  wiseEmail:    string;
  paymentNotes: string;
}

const DEFAULT_PAYMENT_INFO: PaymentInfo = {
  accountName:  "",
  bankName:     "",
  iban:         "",
  bic:          "",
  paypalEmail:  "",
  wiseEmail:    "",
  paymentNotes: "Please include the invoice number as the payment reference.",
};

export async function getPaymentInfo(): Promise<PaymentInfo> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return { ...DEFAULT_PAYMENT_INFO };
  const { data: profile } = await supabase
    .from("profiles")
    .select("payment_info")
    .eq("id", data.session!.user.id)
    .single();
  return (profile?.payment_info as PaymentInfo) ?? { ...DEFAULT_PAYMENT_INFO };
}

export async function savePaymentInfo(info: PaymentInfo): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;
  await supabase
    .from("profiles")
    .update({ payment_info: info })
    .eq("id", data.session!.user.id);
}
