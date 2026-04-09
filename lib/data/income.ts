import { createClient } from "../supabase/client";
import { dispatchWebhook } from "../webhooks";
import type { IncomeEntry, IncomeSource, Currency } from "../mock-data";

function rowToEntry(row: Record<string, unknown>): IncomeEntry {
  return {
    id:                     row.id as string,
    userId:                 row.user_id as string,
    source:                 row.source as IncomeSource,
    amount:                 row.amount as number,
    currency:               row.currency as Currency,
    date:                   row.date as string,
    note:                   (row.note as string) ?? "",
    status:                 row.status as IncomeEntry["status"],
    externalId:             row.external_id as string | undefined,
    clientId:               row.client_id as string | undefined,
    clientName:             row.client_name as string | undefined,
    projectName:            row.project_name as string | undefined,
    isRecurring:            (row.is_recurring as boolean) ?? false,
    recurringId:            row.recurring_id as string | undefined,
    invoiceId:              row.invoice_id as string | undefined,
    amountInHomeCurrency:   row.amount_in_home_currency as number | undefined,
    fxRate:                 row.fx_rate as number | undefined,
    createdAt:              row.created_at as string,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export interface AddIncomeEntryInput {
  amount: number;
  currency: Currency;
  date: string;
  source: IncomeSource;
  note?: string;
  clientId?: string;
  clientName?: string;
  projectName?: string;
  isRecurring?: boolean;
  recurringId?: string;
}

export async function getIncomeEntries(userId?: string): Promise<IncomeEntry[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("income_entries")
    .select("*")
    .eq("user_id", id)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToEntry(r as Record<string, unknown>));
}

export async function addIncomeEntry(
  input: AddIncomeEntryInput,
  userId?: string,
): Promise<IncomeEntry> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("income_entries")
    .insert({
      user_id:      id,
      source:       input.source,
      amount:       input.amount,
      currency:     input.currency,
      date:         input.date,
      note:         input.note ?? "",
      status:       "settled",
      client_id:    input.clientId ?? null,
      client_name:  input.clientName,
      project_name: input.projectName,
      is_recurring: input.isRecurring ?? false,
      recurring_id: input.recurringId ?? (input.isRecurring ? `rec_${Date.now()}` : null),
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to add income entry");
  const entry = rowToEntry(data as Record<string, unknown>);

  // Fire-and-forget: webhook + "new payment" email notification
  dispatchWebhook("income.created", {
    id: entry.id,
    amount: entry.amount,
    currency: entry.currency,
    source: entry.source,
    date: entry.date,
    clientName: entry.clientName,
    note: entry.note,
  });

  if (typeof window !== "undefined") {
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "payment",
        entry: {
          id: entry.id,
          amount: entry.amount,
          currency: entry.currency,
          source: entry.source,
          date: entry.date,
          clientName: entry.clientName,
          note: entry.note,
        },
      }),
    }).catch(() => {});
  }

  return entry;
}

export async function deleteIncomeEntry(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("income_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getIncomeEntriesForRange(
  startDate: string,
  endDate: string,
  userId?: string,
): Promise<IncomeEntry[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("income_entries")
    .select("*")
    .eq("user_id", id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToEntry(r as Record<string, unknown>));
}

export async function createRecurringEntry(
  recurringId: string,
  overrideDate?: string,
  userId?: string,
): Promise<IncomeEntry> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  // Find the template entry for this recurring series
  const { data: rows, error: fetchError } = await supabase
    .from("income_entries")
    .select("*")
    .eq("user_id", id)
    .eq("recurring_id", recurringId)
    .limit(1);
  if (fetchError || !rows?.length) throw new Error(`No recurring entry found for id: ${recurringId}`);
  const template = rowToEntry(rows[0] as Record<string, unknown>);
  const { data, error } = await supabase
    .from("income_entries")
    .insert({
      user_id:      template.userId,
      source:       template.source,
      amount:       template.amount,
      currency:     template.currency,
      date:         overrideDate ?? new Date().toISOString().split("T")[0],
      note:         template.note,
      status:       "settled",
      client_name:  template.clientName,
      project_name: template.projectName,
      is_recurring: true,
      recurring_id: recurringId,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create recurring entry");
  return rowToEntry(data as Record<string, unknown>);
}
