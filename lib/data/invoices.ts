import { createClient } from "../supabase/client";
import { dispatchWebhook } from "../webhooks";
import dayjs from "dayjs";
import type { Invoice } from "../mock-data";

function rowToInvoice(row: Record<string, unknown>): Invoice {
  return {
    id:                   row.id as string,
    userId:               row.user_id as string,
    clientId:             row.client_id as string | undefined,
    invoiceNumber:        row.invoice_number as string,
    clientName:           row.client_name as string,
    clientEmail:          row.client_email as string | undefined,
    clientAddress:        row.client_address as string | undefined,
    items:                (row.items ?? []) as Invoice["items"],
    currency:             row.currency as Invoice["currency"],
    subtotal:             row.subtotal as number,
    taxRate:              row.tax_rate as number | undefined,
    taxAmount:            row.tax_amount as number | undefined,
    total:                row.total as number,
    status:               row.status as Invoice["status"],
    issueDate:            row.issue_date as string,
    dueDate:              row.due_date as string,
    paidAt:               row.paid_at as string | undefined,
    linkedIncomeEntryId:  row.linked_income_entry_id as string | undefined,
    notes:                row.notes as string | undefined,
    createdAt:            row.created_at as string,
    isRecurring:          row.is_recurring as boolean | undefined,
    recurringFrequency:   row.recurring_frequency as Invoice["recurringFrequency"] | undefined,
    recurringNextDate:    row.recurring_next_date as string | undefined,
    recurringParentId:    row.recurring_parent_id as string | undefined,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getInvoices(userId?: string): Promise<Invoice[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToInvoice(r as Record<string, unknown>));
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToInvoice(data as Record<string, unknown>);
}

export async function createInvoice(
  input: Omit<Invoice, "id" | "createdAt">,
): Promise<Invoice> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id:               input.userId,
      client_id:             input.clientId ?? null,
      invoice_number:        input.invoiceNumber,
      client_name:           input.clientName,
      client_email:          input.clientEmail,
      client_address:        input.clientAddress,
      items:                 input.items,
      currency:              input.currency,
      subtotal:              input.subtotal,
      tax_rate:              input.taxRate,
      tax_amount:            input.taxAmount,
      total:                 input.total,
      status:                input.status,
      issue_date:            input.issueDate,
      due_date:              input.dueDate,
      linked_income_entry_id: input.linkedIncomeEntryId,
      notes:                 input.notes,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create invoice");
  return rowToInvoice(data as Record<string, unknown>);
}

export async function updateInvoice(id: string, input: Partial<Invoice>): Promise<Invoice> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if (input.clientId            !== undefined) row.client_id              = input.clientId;
  if (input.invoiceNumber       !== undefined) row.invoice_number         = input.invoiceNumber;
  if (input.clientName          !== undefined) row.client_name            = input.clientName;
  if (input.clientEmail         !== undefined) row.client_email           = input.clientEmail;
  if (input.clientAddress       !== undefined) row.client_address         = input.clientAddress;
  if (input.items               !== undefined) row.items                  = input.items;
  if (input.currency            !== undefined) row.currency               = input.currency;
  if (input.subtotal            !== undefined) row.subtotal               = input.subtotal;
  if (input.taxRate             !== undefined) row.tax_rate               = input.taxRate;
  if (input.taxAmount           !== undefined) row.tax_amount             = input.taxAmount;
  if (input.total               !== undefined) row.total                  = input.total;
  if (input.status              !== undefined) row.status                 = input.status;
  if (input.issueDate           !== undefined) row.issue_date             = input.issueDate;
  if (input.dueDate             !== undefined) row.due_date               = input.dueDate;
  if (input.paidAt              !== undefined) row.paid_at                = input.paidAt;
  if (input.linkedIncomeEntryId !== undefined) row.linked_income_entry_id = input.linkedIncomeEntryId;
  if (input.notes               !== undefined) row.notes                  = input.notes;
  const { data, error } = await supabase
    .from("invoices")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update invoice");
  const invoice = rowToInvoice(data as Record<string, unknown>);

  // Dispatch webhook when invoice transitions to a notable status
  if (input.status === "sent" || input.status === "paid" || input.status === "overdue") {
    dispatchWebhook(`invoice.${input.status}`, {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      total: invoice.total,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      status: invoice.status,
    });
  }

  return invoice;
}

export async function deleteInvoice(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * For each recurring invoice whose recurringNextDate has passed, create the
 * next invoice in the series and update the recurring_next_date on the template.
 * Returns any newly-created invoices so the UI can merge them in.
 */
export async function processRecurringInvoices(userId?: string): Promise<Invoice[]> {
  const id = userId ?? await getCurrentUserId();
  const allInvoices = await getInvoices(id);
  const today = dayjs().format("YYYY-MM-DD");
  const created: Invoice[] = [];

  for (const template of allInvoices.filter(
    (inv) => inv.isRecurring && inv.recurringNextDate && inv.recurringNextDate <= today,
  )) {
    const freq = template.recurringFrequency ?? "monthly";
    const nextIssueDate = template.recurringNextDate!;
    const nextDueDate = dayjs(nextIssueDate).add(30, "day").format("YYYY-MM-DD");
    const nextRecurringDate = dayjs(nextIssueDate)
      .add(freq === "monthly" ? 1 : freq === "quarterly" ? 3 : 12, "month")
      .format("YYYY-MM-DD");

    // Create the new invoice (draft, ready to review + send)
    const newInvoice = await createInvoice({
      userId: id,
      clientId: template.clientId,
      invoiceNumber: `${template.invoiceNumber}-R${dayjs().format("YYYYMMDD")}`,
      clientName: template.clientName,
      clientEmail: template.clientEmail,
      clientAddress: template.clientAddress,
      items: template.items,
      currency: template.currency,
      subtotal: template.subtotal,
      taxRate: template.taxRate,
      taxAmount: template.taxAmount,
      total: template.total,
      status: "draft",
      issueDate: nextIssueDate,
      dueDate: nextDueDate,
      notes: template.notes,
      recurringParentId: template.id,
    });
    created.push(newInvoice);

    // Advance the template's next date
    await updateInvoice(template.id, { recurringNextDate: nextRecurringDate });
  }

  return created;
}
