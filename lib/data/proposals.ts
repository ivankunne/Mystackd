import { createClient } from "../supabase/client";
import type { Proposal } from "../mock-data";

function rowToProposal(row: Record<string, unknown>): Proposal {
  return {
    id:                      row.id as string,
    userId:                  row.user_id as string,
    clientId:                row.client_id as string,
    clientName:              row.client_name as string,
    projectName:             row.project_name as string,
    status:                  row.status as Proposal["status"],
    items:                   (row.items ?? []) as Proposal["items"],
    currency:                row.currency as Proposal["currency"],
    subtotal:                row.subtotal as number,
    total:                   row.total as number,
    validUntil:              row.valid_until as string,
    scope:                   row.scope as string | undefined,
    deliverables:            row.deliverables as string | undefined,
    notes:                   row.notes as string | undefined,
    createdAt:               row.created_at as string,
    sentAt:                  row.sent_at as string | undefined,
    respondedAt:             row.responded_at as string | undefined,
    convertedToInvoiceId:    row.converted_to_invoice_id as string | undefined,
    convertedToContractId:   row.converted_to_contract_id as string | undefined,
    convertedToProjectId:    row.converted_to_project_id as string | undefined,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getProposals(userId?: string): Promise<Proposal[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToProposal(r as Record<string, unknown>));
}

export async function getProposalsForClient(clientId: string): Promise<Proposal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToProposal(r as Record<string, unknown>));
}

export async function createProposal(
  input: Omit<Proposal, "id" | "createdAt">,
): Promise<Proposal> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      user_id:                  input.userId,
      client_id:                input.clientId,
      client_name:              input.clientName,
      project_name:             input.projectName,
      status:                   input.status,
      items:                    input.items,
      currency:                 input.currency,
      subtotal:                 input.subtotal,
      total:                    input.total,
      valid_until:              input.validUntil,
      scope:                    input.scope,
      deliverables:             input.deliverables,
      notes:                    input.notes,
      sent_at:                  input.sentAt,
      responded_at:             input.respondedAt,
      converted_to_invoice_id:  input.convertedToInvoiceId,
      converted_to_contract_id: input.convertedToContractId,
      converted_to_project_id:  input.convertedToProjectId,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create proposal");
  return rowToProposal(data as Record<string, unknown>);
}

export async function updateProposal(id: string, input: Partial<Proposal>): Promise<Proposal> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if (input.clientId               !== undefined) row.client_id                = input.clientId;
  if (input.clientName             !== undefined) row.client_name              = input.clientName;
  if (input.projectName            !== undefined) row.project_name             = input.projectName;
  if (input.status                 !== undefined) row.status                   = input.status;
  if (input.items                  !== undefined) row.items                    = input.items;
  if (input.currency               !== undefined) row.currency                 = input.currency;
  if (input.subtotal               !== undefined) row.subtotal                 = input.subtotal;
  if (input.total                  !== undefined) row.total                    = input.total;
  if (input.validUntil             !== undefined) row.valid_until              = input.validUntil;
  if (input.scope                  !== undefined) row.scope                    = input.scope;
  if (input.deliverables           !== undefined) row.deliverables             = input.deliverables;
  if (input.notes                  !== undefined) row.notes                    = input.notes;
  if (input.sentAt                 !== undefined) row.sent_at                  = input.sentAt;
  if (input.respondedAt            !== undefined) row.responded_at             = input.respondedAt;
  if (input.convertedToInvoiceId   !== undefined) row.converted_to_invoice_id  = input.convertedToInvoiceId;
  if (input.convertedToContractId  !== undefined) row.converted_to_contract_id = input.convertedToContractId;
  if (input.convertedToProjectId   !== undefined) row.converted_to_project_id  = input.convertedToProjectId;
  const { data, error } = await supabase
    .from("proposals")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update proposal");
  return rowToProposal(data as Record<string, unknown>);
}

export async function getProposalById(id: string): Promise<Proposal | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return rowToProposal(data as Record<string, unknown>);
}

export async function deleteProposal(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getAcceptedProposals(userId?: string): Promise<Proposal[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", id)
    .eq("status", "accepted")
    .order("responded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToProposal(r as Record<string, unknown>));
}
