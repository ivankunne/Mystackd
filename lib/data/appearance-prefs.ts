import { createClient } from "../supabase/client";

export interface AppearancePrefs {
  dateFormat: string;
  numberFormat: string;
  weekStart: string;
  fiscalYearStart: string;
}

const DEFAULTS: AppearancePrefs = {
  dateFormat: "DD/MM/YYYY",
  numberFormat: "1,000.00",
  weekStart: "monday",
  fiscalYearStart: "january",
};

export async function getAppearancePrefs(): Promise<AppearancePrefs> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return { ...DEFAULTS };
  const { data: profile } = await supabase
    .from("profiles")
    .select("appearance_prefs")
    .eq("id", data.session!.user.id)
    .single();
  return (profile?.appearance_prefs as AppearancePrefs) ?? { ...DEFAULTS };
}

export async function saveAppearancePrefs(prefs: AppearancePrefs): Promise<void> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return;
  await supabase
    .from("profiles")
    .update({ appearance_prefs: prefs })
    .eq("id", data.session!.user.id);
}
