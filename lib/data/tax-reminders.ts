import { createClient } from "../supabase/client";
import type { TaxReminder } from "../mock-data";

function rowToReminder(row: Record<string, unknown>): TaxReminder {
  return {
    id:              row.id as string,
    quarter:         row.quarter as number,
    year:            row.year as number,
    dueDate:         row.due_date as string,
    estimatedAmount: row.estimated_amount as number,
    currency:        row.currency as TaxReminder["currency"],
    isPaid:          row.is_paid as boolean,
    country:         row.country as string,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getTaxReminders(userId?: string): Promise<TaxReminder[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("tax_reminders")
    .select("*")
    .eq("user_id", id)
    .order("year", { ascending: false })
    .order("quarter", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToReminder(r as Record<string, unknown>));
}

export async function upsertTaxReminder(
  reminder: Omit<TaxReminder, "id"> & { userId: string },
): Promise<TaxReminder> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tax_reminders")
    .upsert(
      {
        user_id:          reminder.userId,
        quarter:          reminder.quarter,
        year:             reminder.year,
        due_date:         reminder.dueDate,
        estimated_amount: reminder.estimatedAmount,
        currency:         reminder.currency,
        is_paid:          reminder.isPaid,
        country:          reminder.country,
      },
      { onConflict: "user_id,quarter,year" },
    )
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to upsert tax reminder");
  return rowToReminder(data as Record<string, unknown>);
}

export async function markTaxReminderPaid(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tax_reminders")
    .update({ is_paid: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
