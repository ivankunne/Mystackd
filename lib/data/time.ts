import { createClient } from "../supabase/client";
import type { TimeEntry } from "../mock-data";

function rowToEntry(row: Record<string, unknown>): TimeEntry {
  return {
    id:              row.id as string,
    userId:          row.user_id as string,
    date:            row.date as string,
    clientName:      row.client_name as string,
    projectName:     row.project_name as string | undefined,
    description:     row.description as string,
    durationMinutes: row.duration_minutes as number,
    hourlyRate:      row.hourly_rate as number,
    currency:        row.currency as TimeEntry["currency"],
    isBilled:        (row.is_billed as boolean) ?? false,
    invoiceId:       row.invoice_id as string | undefined,
    createdAt:       row.created_at as string,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getTimeEntries(userId?: string): Promise<TimeEntry[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", id)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToEntry(r as Record<string, unknown>));
}

export async function createTimeEntry(
  input: Omit<TimeEntry, "id" | "createdAt">,
): Promise<TimeEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .insert({
      user_id:          input.userId,
      date:             input.date,
      client_name:      input.clientName,
      project_name:     input.projectName,
      description:      input.description,
      duration_minutes: input.durationMinutes,
      hourly_rate:      input.hourlyRate,
      currency:         input.currency,
      is_billed:        input.isBilled ?? false,
      invoice_id:       input.invoiceId,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create time entry");
  return rowToEntry(data as Record<string, unknown>);
}

export async function updateTimeEntry(
  id: string,
  input: Partial<Omit<TimeEntry, "id" | "userId" | "createdAt">>,
): Promise<TimeEntry> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if (input.date            !== undefined) row.date             = input.date;
  if (input.clientName      !== undefined) row.client_name      = input.clientName;
  if (input.projectName     !== undefined) row.project_name     = input.projectName;
  if (input.description     !== undefined) row.description      = input.description;
  if (input.durationMinutes !== undefined) row.duration_minutes = input.durationMinutes;
  if (input.hourlyRate      !== undefined) row.hourly_rate      = input.hourlyRate;
  if (input.currency        !== undefined) row.currency         = input.currency;
  if (input.isBilled        !== undefined) row.is_billed        = input.isBilled;
  if (input.invoiceId       !== undefined) row.invoice_id       = input.invoiceId;
  const { data, error } = await supabase
    .from("time_entries")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update time entry");
  return rowToEntry(data as Record<string, unknown>);
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("time_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function markEntriesBilled(ids: string[], invoiceId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("time_entries")
    .update({ is_billed: true, invoice_id: invoiceId })
    .in("id", ids);
  if (error) throw new Error(error.message);
}
