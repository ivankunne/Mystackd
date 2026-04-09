import { createClient } from "../supabase/client";
import type { Contract } from "../mock-data";

function rowToContract(row: Record<string, unknown>): Contract {
  return {
    id:                       row.id as string,
    userId:                   row.user_id as string,
    clientId:                 row.client_id as string,
    clientName:               row.client_name as string,
    projectName:              row.project_name as string,
    status:                   row.status as Contract["status"],
    proposalId:               row.proposal_id as string | undefined,
    rate:                     row.rate as number,
    rateType:                 row.rate_type as Contract["rateType"],
    currency:                 row.currency as Contract["currency"],
    paymentTermsDays:         row.payment_terms_days as number,
    startDate:                row.start_date as string,
    endDate:                  row.end_date as string | undefined,
    scope:                    row.scope as string,
    deliverables:             row.deliverables as string,
    revisionPolicy:           row.revision_policy as string | undefined,
    terminationClause:        row.termination_clause as string | undefined,
    notes:                    row.notes as string | undefined,
    createdAt:                row.created_at as string,
    signedAt:                 row.signed_at as string | undefined,
    freelancerSignatureName:  row.freelancer_signature_name as string | undefined,
    clientSignatureName:      row.client_signature_name as string | undefined,
    clientSignedAt:           row.client_signed_at as string | undefined,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getContracts(userId?: string): Promise<Contract[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToContract(r as Record<string, unknown>));
}

export async function getContractsForClient(clientId: string): Promise<Contract[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToContract(r as Record<string, unknown>));
}

export async function createContract(
  input: Omit<Contract, "id" | "createdAt">,
): Promise<Contract> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contracts")
    .insert({
      user_id:                   input.userId,
      client_id:                 input.clientId,
      client_name:               input.clientName,
      project_name:              input.projectName,
      status:                    input.status,
      proposal_id:               input.proposalId,
      rate:                      input.rate,
      rate_type:                 input.rateType,
      currency:                  input.currency,
      payment_terms_days:        input.paymentTermsDays,
      start_date:                input.startDate,
      end_date:                  input.endDate,
      scope:                     input.scope,
      deliverables:              input.deliverables,
      revision_policy:           input.revisionPolicy,
      termination_clause:        input.terminationClause,
      notes:                     input.notes,
      signed_at:                 input.signedAt,
      freelancer_signature_name: input.freelancerSignatureName,
      client_signature_name:     input.clientSignatureName,
      client_signed_at:          input.clientSignedAt,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create contract");
  return rowToContract(data as Record<string, unknown>);
}

export async function updateContract(id: string, input: Partial<Contract>): Promise<Contract> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if (input.clientId               !== undefined) row.client_id                = input.clientId;
  if (input.clientName             !== undefined) row.client_name              = input.clientName;
  if (input.projectName            !== undefined) row.project_name             = input.projectName;
  if (input.status                 !== undefined) row.status                   = input.status;
  if (input.proposalId             !== undefined) row.proposal_id              = input.proposalId;
  if (input.rate                   !== undefined) row.rate                     = input.rate;
  if (input.rateType               !== undefined) row.rate_type                = input.rateType;
  if (input.currency               !== undefined) row.currency                 = input.currency;
  if (input.paymentTermsDays       !== undefined) row.payment_terms_days       = input.paymentTermsDays;
  if (input.startDate              !== undefined) row.start_date               = input.startDate;
  if (input.endDate                !== undefined) row.end_date                 = input.endDate;
  if (input.scope                  !== undefined) row.scope                    = input.scope;
  if (input.deliverables           !== undefined) row.deliverables             = input.deliverables;
  if (input.revisionPolicy         !== undefined) row.revision_policy          = input.revisionPolicy;
  if (input.terminationClause      !== undefined) row.termination_clause       = input.terminationClause;
  if (input.notes                  !== undefined) row.notes                    = input.notes;
  if (input.signedAt               !== undefined) row.signed_at                = input.signedAt;
  if (input.freelancerSignatureName !== undefined) row.freelancer_signature_name = input.freelancerSignatureName;
  if (input.clientSignatureName    !== undefined) row.client_signature_name    = input.clientSignatureName;
  if (input.clientSignedAt         !== undefined) row.client_signed_at         = input.clientSignedAt;
  const { data, error } = await supabase
    .from("contracts")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update contract");
  return rowToContract(data as Record<string, unknown>);
}

export async function deleteContract(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
