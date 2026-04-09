import { createClient } from "../supabase/client";

export interface NotifPrefs {
  weeklyDigest:    boolean;
  monthlyReport:   boolean;
  taxReminders:    boolean;
  invoiceOverdue:  boolean;
  newPayment:      boolean;
  productUpdates:  boolean;
  dashboardBanners: boolean;
}

const DEFAULTS: NotifPrefs = {
  weeklyDigest:    true,
  monthlyReport:   true,
  taxReminders:    true,
  invoiceOverdue:  true,
  newPayment:      false,
  productUpdates:  true,
  dashboardBanners: true,
};

export async function getNotifPrefs(): Promise<NotifPrefs> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return { ...DEFAULTS };
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", data.session!.user.id)
    .single();
  return (profile?.notification_prefs as NotifPrefs) ?? { ...DEFAULTS };
}

export async function saveNotifPrefs(prefs: NotifPrefs): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;
  await supabase
    .from("profiles")
    .update({ notification_prefs: prefs })
    .eq("id", data.session!.user.id);
}
