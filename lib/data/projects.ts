import { createClient } from "../supabase/client";
import type { Project } from "../mock-data";

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id:           row.id as string,
    userId:       row.user_id as string,
    clientId:     row.client_id as string,
    clientName:   row.client_name as string,
    name:         row.name as string,
    status:       row.status as Project["status"],
    budgetAmount: row.budget_amount as number | undefined,
    currency:     row.currency as Project["currency"],
    startDate:    row.start_date as string,
    endDate:      row.end_date as string | undefined,
    contractId:   row.contract_id as string | undefined,
    proposalId:   row.proposal_id as string | undefined,
    notes:        row.notes as string | undefined,
    createdAt:    row.created_at as string,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getProjects(userId?: string): Promise<Project[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToProject(r as Record<string, unknown>));
}

export async function getProjectsForClient(clientId: string): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToProject(r as Record<string, unknown>));
}

export async function createProject(
  input: Omit<Project, "id" | "createdAt">,
): Promise<Project> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id:       input.userId,
      client_id:     input.clientId,
      client_name:   input.clientName,
      name:          input.name,
      status:        input.status,
      budget_amount: input.budgetAmount,
      currency:      input.currency,
      start_date:    input.startDate,
      end_date:      input.endDate,
      contract_id:   input.contractId,
      proposal_id:   input.proposalId,
      notes:         input.notes,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create project");
  return rowToProject(data as Record<string, unknown>);
}

export async function updateProject(id: string, input: Partial<Project>): Promise<Project> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if (input.clientId     !== undefined) row.client_id     = input.clientId;
  if (input.clientName   !== undefined) row.client_name   = input.clientName;
  if (input.name         !== undefined) row.name          = input.name;
  if (input.status       !== undefined) row.status        = input.status;
  if (input.budgetAmount !== undefined) row.budget_amount = input.budgetAmount;
  if (input.currency     !== undefined) row.currency      = input.currency;
  if (input.startDate    !== undefined) row.start_date    = input.startDate;
  if (input.endDate      !== undefined) row.end_date      = input.endDate;
  if (input.contractId   !== undefined) row.contract_id   = input.contractId;
  if (input.proposalId   !== undefined) row.proposal_id   = input.proposalId;
  if (input.notes        !== undefined) row.notes         = input.notes;
  const { data, error } = await supabase
    .from("projects")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update project");
  return rowToProject(data as Record<string, unknown>);
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
