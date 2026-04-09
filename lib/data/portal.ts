import { createClient } from "../supabase/client";
import type { ProjectUpdate, SharedFile, ClientFeedback, ClientPortal } from "../mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToPortal(row: Record<string, unknown>): ClientPortal {
  return {
    clientId:       row.client_id as string,
    userId:         row.user_id as string | undefined,
    token:          row.token as string,
    isEnabled:      (row.is_enabled as boolean) ?? false,
    freelancerName: row.freelancer_name as string,
    headerNote:     row.header_note as string | undefined,
    allowFeedback:  (row.allow_feedback as boolean) ?? true,
    showInvoices:   (row.show_invoices as boolean) ?? true,
    showFiles:      (row.show_files as boolean) ?? true,
    showUpdates:    (row.show_updates as boolean) ?? true,
  };
}

function rowToUpdate(row: Record<string, unknown>): ProjectUpdate {
  return {
    id:        row.id as string,
    clientId:  row.client_id as string,
    userId:    row.user_id as string,
    title:     row.title as string,
    content:   row.content as string,
    status:    row.status as ProjectUpdate["status"],
    createdAt: row.created_at as string,
  };
}

function rowToFile(row: Record<string, unknown>): SharedFile {
  return {
    id:          row.id as string,
    clientId:    row.client_id as string,
    userId:      row.user_id as string,
    name:        row.name as string,
    type:        row.type as SharedFile["type"],
    sizeLabel:   row.size_label as string,
    description: row.description as string | undefined,
    uploadedAt:  row.uploaded_at as string,
    storagePath: row.storage_path as string | undefined,
    storageUrl:  row.storage_url as string | undefined,
  };
}

function rowToFeedback(row: Record<string, unknown>): ClientFeedback {
  return {
    id:          row.id as string,
    clientId:    row.client_id as string,
    fileId:      row.file_id as string | undefined,
    authorName:  row.author_name as string,
    content:     row.content as string,
    submittedAt: row.submitted_at as string,
    isRead:      (row.is_read as boolean) ?? false,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

// ─── Portal settings ──────────────────────────────────────────────────────────

export async function getPortal(clientId: string): Promise<ClientPortal | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_portals")
    .select("*")
    .eq("client_id", clientId)
    .single();
  return data ? rowToPortal(data as Record<string, unknown>) : null;
}

export async function getAllPortals(): Promise<ClientPortal[]> {
  const supabase = createClient();
  const id = await getCurrentUserId();
  const { data, error } = await supabase
    .from("client_portals")
    .select("*")
    .eq("user_id", id);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToPortal(r as Record<string, unknown>));
}

export async function getPortalByToken(token: string): Promise<ClientPortal | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("client_portals")
    .select("*")
    .eq("token", token)
    .eq("is_enabled", true)
    .single();
  return data ? rowToPortal(data as Record<string, unknown>) : null;
}

export async function savePortal(settings: ClientPortal): Promise<ClientPortal> {
  const supabase = createClient();
  const id = await getCurrentUserId();
  const { data, error } = await supabase
    .from("client_portals")
    .upsert({
      client_id:       settings.clientId,
      user_id:         id,
      token:           settings.token,
      is_enabled:      settings.isEnabled,
      freelancer_name: settings.freelancerName,
      header_note:     settings.headerNote,
      allow_feedback:  settings.allowFeedback,
      show_invoices:   settings.showInvoices,
      show_files:      settings.showFiles,
      show_updates:    settings.showUpdates,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to save portal");
  return rowToPortal(data as Record<string, unknown>);
}

// ─── Project updates ──────────────────────────────────────────────────────────

export async function getProjectUpdates(clientId: string): Promise<ProjectUpdate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("portal_updates")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToUpdate(r as Record<string, unknown>));
}

export async function createProjectUpdate(
  input: Omit<ProjectUpdate, "id" | "createdAt">,
): Promise<ProjectUpdate> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("portal_updates")
    .insert({
      client_id: input.clientId,
      user_id:   input.userId,
      title:     input.title,
      content:   input.content,
      status:    input.status,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create update");
  return rowToUpdate(data as Record<string, unknown>);
}

export async function deleteProjectUpdate(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("portal_updates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Shared files ─────────────────────────────────────────────────────────────

export async function getSharedFiles(clientId: string): Promise<SharedFile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shared_files")
    .select("*")
    .eq("client_id", clientId)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToFile(r as Record<string, unknown>));
}

export async function createSharedFile(
  input: Omit<SharedFile, "id" | "uploadedAt">,
): Promise<SharedFile> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("shared_files")
    .insert({
      client_id:    input.clientId,
      user_id:      input.userId,
      name:         input.name,
      type:         input.type,
      size_label:   input.sizeLabel,
      description:  input.description,
      storage_path: input.storagePath ?? null,
      storage_url:  input.storageUrl ?? null,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to create file");
  return rowToFile(data as Record<string, unknown>);
}

export async function deleteSharedFile(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("shared_files").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Client feedback ──────────────────────────────────────────────────────────

export async function getFeedback(clientId: string): Promise<ClientFeedback[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("client_feedback")
    .select("*")
    .eq("client_id", clientId)
    .order("submitted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToFeedback(r as Record<string, unknown>));
}

export async function submitFeedback(
  input: Omit<ClientFeedback, "id" | "submittedAt" | "isRead">,
): Promise<ClientFeedback> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("client_feedback")
    .insert({
      client_id:   input.clientId,
      file_id:     input.fileId,
      author_name: input.authorName,
      content:     input.content,
    })
    .select()
    .single();
  if (error || !data) throw new Error(error?.message ?? "Failed to submit feedback");
  return rowToFeedback(data as Record<string, unknown>);
}

export async function markFeedbackRead(clientId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("client_feedback")
    .update({ is_read: true })
    .eq("client_id", clientId);
  if (error) throw new Error(error.message);
}
