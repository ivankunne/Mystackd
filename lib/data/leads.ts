import { createClient } from "../supabase/client";
import type { Lead, LeadStage } from "../mock-data";

function rowToLead(row: Record<string, unknown>): Lead {
  return {
    id:                   row.id as string,
    userId:               row.user_id as string,
    name:                 row.name as string,
    company:              row.company as string,
    email:                row.email as string | undefined,
    source:               row.source as Lead["source"],
    stage:                row.stage as Lead["stage"],
    estimatedValue:       row.estimated_value as number | undefined,
    currency:             row.currency as Lead["currency"],
    notes:                row.notes as string | undefined,
    convertedToClientId:  row.converted_to_client_id as string | undefined,
    createdAt:            row.created_at as string,
    updatedAt:            row.updated_at as string,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getLeads(userId?: string): Promise<Lead[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("user_id", id)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToLead(r as Record<string, unknown>));
}

export async function createLead(
  input: Omit<Lead, "id" | "createdAt" | "updatedAt">,
): Promise<Lead> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      user_id:                input.userId,
      name:                   input.name,
      company:                input.company,
      email:                  input.email,
      source:                 input.source,
      stage:                  input.stage,
      estimated_value:        input.estimatedValue,
      currency:               input.currency,
      notes:                  input.notes,
      converted_to_client_id: input.convertedToClientId,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create lead");
  return rowToLead(data as Record<string, unknown>);
}

export async function updateLead(id: string, input: Partial<Lead>): Promise<Lead> {
  const supabase = createClient();
  const row: Record<string, unknown> = {};
  if (input.name                !== undefined) row.name                    = input.name;
  if (input.company             !== undefined) row.company                 = input.company;
  if (input.email               !== undefined) row.email                   = input.email;
  if (input.source              !== undefined) row.source                  = input.source;
  if (input.stage               !== undefined) row.stage                   = input.stage;
  if (input.estimatedValue      !== undefined) row.estimated_value         = input.estimatedValue;
  if (input.currency            !== undefined) row.currency                = input.currency;
  if (input.notes               !== undefined) row.notes                   = input.notes;
  if (input.convertedToClientId !== undefined) row.converted_to_client_id  = input.convertedToClientId;
  const { data, error } = await supabase
    .from("leads")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update lead");
  return rowToLead(data as Record<string, unknown>);
}

export async function moveLead(id: string, stage: LeadStage): Promise<Lead> {
  return updateLead(id, { stage });
}

export async function deleteLead(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
