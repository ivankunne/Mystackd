import { createClient as supabaseClient } from "../supabase/client";
import type { Client } from "../mock-data";

function rowToClient(row: Record<string, unknown>): Client {
  return {
    id:        row.id as string,
    userId:    row.user_id as string,
    name:      row.name as string,
    email:     row.email as string | undefined,
    company:   row.company as string | undefined,
    country:   row.country as string | undefined,
    notes:     row.notes as string | undefined,
    createdAt: row.created_at as string,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = supabaseClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getClients(userId?: string): Promise<Client[]> {
  const supabase = supabaseClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToClient(r as Record<string, unknown>));
}

export async function createClient(
  input: Omit<Client, "id" | "createdAt">,
): Promise<Client> {
  const supabase = supabaseClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      user_id: input.userId,
      name:    input.name,
      email:   input.email,
      company: input.company,
      country: input.country,
      notes:   input.notes,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create client");
  return rowToClient(data as Record<string, unknown>);
}

export async function updateClient(id: string, input: Partial<Client>): Promise<Client> {
  const supabase = supabaseClient();
  const row: Record<string, unknown> = {};
  if (input.name    !== undefined) row.name    = input.name;
  if (input.email   !== undefined) row.email   = input.email;
  if (input.company !== undefined) row.company = input.company;
  if (input.country !== undefined) row.country = input.country;
  if (input.notes   !== undefined) row.notes   = input.notes;
  const { data, error } = await supabase
    .from("clients")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to update client");
  return rowToClient(data as Record<string, unknown>);
}

export async function deleteClient(id: string): Promise<void> {
  const supabase = supabaseClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
