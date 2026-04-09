import { createClient } from "../supabase/client";
import type { User, Currency, Webhook } from "../mock-data";

export interface UpdateUserProfileInput {
  name?: string;
  email?: string;
  country?: string;
  currency?: Currency;
  monthlyExpenses?: {
    rent?: number;
    subscriptions?: number;
    other?: number;
  };
  taxBracket?: number;
  publicPageSlug?: string;
  publicPageEnabled?: boolean;
  phone?: string;
  website?: string;
  bio?: string;
  language?: string;
}

// Maps a profiles DB row (snake_case) to the app's User type (camelCase)
function rowToUser(row: Record<string, unknown>): User {
  return {
    id:                (row.id as string),
    name:              (row.name as string) ?? "",
    email:             (row.email as string) ?? "",
    currency:          (row.currency as Currency) ?? "EUR",
    country:           (row.country as string) ?? "NO",
    monthlyExpenses:   (row.monthly_expenses as User["monthlyExpenses"]) ?? { rent: 0, subscriptions: 0, other: 0 },
    taxBracket:        (row.tax_bracket as number) ?? 0.33,
    isPro:             (row.is_pro as boolean) ?? false,
    emailVerified:     (row.email_verified as boolean) ?? false,
    incomeGoal:        row.income_goal as number | undefined,
    publicPageEnabled: (row.public_page_enabled as boolean) ?? false,
    publicPageSlug:    row.public_page_slug as string | undefined,
    phone:             row.phone as string | undefined,
    website:           row.website as string | undefined,
    bio:               row.bio as string | undefined,
    language:          row.language as string | undefined,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session.user.id;
}

export async function getUserProfile(userId?: string): Promise<User> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Profile not found");
  return rowToUser(data as Record<string, unknown>);
}

export async function updateUserProfile(
  input: UpdateUserProfileInput,
  userId?: string,
): Promise<User> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();

  // Build the update row — only include fields that were provided
  const row: Record<string, unknown> = {};
  if (input.name !== undefined)              row.name = input.name;
  if (input.email !== undefined)             row.email = input.email;
  if (input.country !== undefined)           row.country = input.country;
  if (input.currency !== undefined)          row.currency = input.currency;
  if (input.taxBracket !== undefined)        row.tax_bracket = input.taxBracket;
  if (input.publicPageSlug !== undefined)    row.public_page_slug = input.publicPageSlug;
  if (input.publicPageEnabled !== undefined) row.public_page_enabled = input.publicPageEnabled;
  if (input.phone !== undefined)             row.phone = input.phone;
  if (input.website !== undefined)           row.website = input.website;
  if (input.bio !== undefined)               row.bio = input.bio;
  if (input.language !== undefined)          row.language = input.language;

  // Deep-merge monthly_expenses so a partial update doesn't wipe other fields
  if (input.monthlyExpenses !== undefined) {
    const { data: current } = await supabase
      .from("profiles")
      .select("monthly_expenses")
      .eq("id", id)
      .single();
    const existing = (current?.monthly_expenses as User["monthlyExpenses"]) ?? { rent: 0, subscriptions: 0, other: 0 };
    row.monthly_expenses = { ...existing, ...input.monthlyExpenses };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update profile");
  return rowToUser(data as Record<string, unknown>);
}

export async function deleteUserAccount(userId?: string): Promise<void> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  // Delete the profile row — foreign key cascades wipe all user data in the DB.
  // The auth.users row requires a server-side admin call (future: Edge Function).
  await supabase.from("profiles").delete().eq("id", id);
  await supabase.auth.signOut();
}

export async function updateIncomeGoal(goal: number, userId?: string): Promise<User> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .update({ income_goal: goal })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update goal");
  return rowToUser(data as Record<string, unknown>);
}

export async function updatePublicPageSettings(
  settings: { publicPageEnabled?: boolean; publicPageSlug?: string },
  userId?: string,
): Promise<User> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const row: Record<string, unknown> = {};
  if (settings.publicPageEnabled !== undefined) row.public_page_enabled = settings.publicPageEnabled;
  if (settings.publicPageSlug !== undefined)    row.public_page_slug = settings.publicPageSlug;
  const { data, error } = await supabase
    .from("profiles")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update public page settings");
  return rowToUser(data as Record<string, unknown>);
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export async function getWebhooks(userId?: string): Promise<Webhook[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("user_id", id)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((w) => ({
    id: w.id,
    url: w.url,
    events: w.events,
    isActive: w.is_active,
    createdAt: w.created_at,
  }));
}

export async function updateWebhooks(webhooks: Webhook[], userId?: string): Promise<void> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  // Delete all existing webhooks for this user and re-insert
  await supabase.from("webhooks").delete().eq("user_id", id);
  if (webhooks.length === 0) return;
  const rows = webhooks.map((w) => ({
    id: w.id,
    user_id: id,
    url: w.url,
    events: w.events,
    is_active: w.isActive,
    created_at: w.createdAt,
  }));
  const { error } = await supabase.from("webhooks").insert(rows);
  if (error) throw new Error(error.message);
}
