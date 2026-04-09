import { createClient } from "../supabase/client";
import type { Expense } from "../mock-data";

function rowToExpense(row: Record<string, unknown>): Expense {
  return {
    id:               row.id as string,
    userId:           row.user_id as string,
    date:             row.date as string,
    amount:           row.amount as number,
    currency:         row.currency as Expense["currency"],
    category:         row.category as Expense["category"],
    description:      row.description as string,
    vendor:           row.vendor as string | undefined,
    isTaxDeductible:  (row.is_tax_deductible as boolean) ?? false,
    isRecurring:      (row.is_recurring as boolean) ?? false,
    recurringId:      row.recurring_id as string | undefined,
    createdAt:        row.created_at as string,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getExpenses(userId?: string): Promise<Expense[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", id)
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToExpense(r as Record<string, unknown>));
}

export async function createExpense(
  input: Omit<Expense, "id" | "createdAt">,
): Promise<Expense> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      user_id:           input.userId,
      date:              input.date,
      amount:            input.amount,
      currency:          input.currency,
      category:          input.category,
      description:       input.description,
      vendor:            input.vendor,
      is_tax_deductible: input.isTaxDeductible,
      is_recurring:      input.isRecurring ?? false,
      recurring_id:      input.recurringId,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create expense");
  return rowToExpense(data as Record<string, unknown>);
}

export async function updateExpense(
  id: string,
  input: Partial<Omit<Expense, "id" | "userId" | "createdAt">>,
): Promise<Expense> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if (input.date             !== undefined) row.date              = input.date;
  if (input.amount           !== undefined) row.amount            = input.amount;
  if (input.currency         !== undefined) row.currency          = input.currency;
  if (input.category         !== undefined) row.category          = input.category;
  if (input.description      !== undefined) row.description       = input.description;
  if (input.vendor           !== undefined) row.vendor            = input.vendor;
  if (input.isTaxDeductible  !== undefined) row.is_tax_deductible = input.isTaxDeductible;
  if (input.isRecurring      !== undefined) row.is_recurring      = input.isRecurring;
  if (input.recurringId      !== undefined) row.recurring_id      = input.recurringId;
  const { data, error } = await supabase
    .from("expenses")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update expense");
  return rowToExpense(data as Record<string, unknown>);
}

export async function deleteExpense(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
