import { createClient } from "../supabase/client";
import type { ReminderLog, ReminderChannel } from "../mock-data";

function rowToLog(row: Record<string, unknown>): ReminderLog {
  return {
    id:        row.id as string,
    userId:    row.user_id as string,
    invoiceId: row.invoice_id as string,
    sentAt:    row.sent_at as string,
    channel:   row.channel as ReminderChannel,
    note:      row.note as string | undefined,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getReminderLogs(userId?: string): Promise<ReminderLog[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("reminder_logs")
    .select("*")
    .eq("user_id", id)
    .order("sent_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToLog(r as Record<string, unknown>));
}

export async function getReminderLogsForInvoice(invoiceId: string): Promise<ReminderLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reminder_logs")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("sent_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToLog(r as Record<string, unknown>));
}

export async function logReminder(input: Omit<ReminderLog, "id">): Promise<ReminderLog> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("reminder_logs")
    .insert({
      user_id:    input.userId,
      invoice_id: input.invoiceId,
      sent_at:    input.sentAt,
      channel:    input.channel,
      note:       input.note,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to log reminder");
  return rowToLog(data as Record<string, unknown>);
}

export async function deleteReminderLog(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("reminder_logs").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
