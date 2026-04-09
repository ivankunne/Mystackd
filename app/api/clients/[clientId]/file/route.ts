import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient as createBrowserClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;

  // Verify the caller is authenticated
  const authClient = await createBrowserClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const description = (formData.get("description") as string | null) ?? "";
  const type = (formData.get("type") as string | null) ?? "other";

  if (!file) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Build a unique storage path: userId/clientId/timestamp-filename
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${userId}/${clientId}/${Date.now()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage
    .from("portal-files")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Generate a signed URL valid for 7 days (refreshed on each portal load)
  const { data: signedData, error: signedError } = await supabase.storage
    .from("portal-files")
    .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

  const storageUrl = signedError ? "" : (signedData?.signedUrl ?? "");

  const sizeLabel = file.size < 1024
    ? `${file.size} B`
    : file.size < 1024 * 1024
    ? `${(file.size / 1024).toFixed(1)} KB`
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  const { data: row, error: dbError } = await supabase
    .from("shared_files")
    .insert({
      client_id:    clientId,
      user_id:      userId,
      name:         file.name,
      type:         type,
      size_label:   sizeLabel,
      description:  description || null,
      storage_path: storagePath,
      storage_url:  storageUrl,
    })
    .select()
    .single();

  if (dbError || !row) {
    // Attempt to clean up the uploaded file
    await supabase.storage.from("portal-files").remove([storagePath]);
    return NextResponse.json({ error: dbError?.message ?? "db_error" }, { status: 500 });
  }

  return NextResponse.json({
    id:          row.id,
    clientId:    row.client_id,
    userId:      row.user_id,
    name:        row.name,
    type:        row.type,
    sizeLabel:   row.size_label,
    description: row.description,
    uploadedAt:  row.uploaded_at,
    storagePath: row.storage_path,
    storageUrl:  row.storage_url,
  });
}

export async function DELETE(
  request: Request,
  { params: _params }: { params: Promise<{ clientId: string }> },
) {
  const authClient = await createBrowserClient();
  const { data: { session } } = await authClient.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { fileId } = await request.json();
  if (!fileId) return NextResponse.json({ error: "missing fileId" }, { status: 400 });

  const supabase = createServiceClient();

  // Fetch the row to get the storage path
  const { data: row } = await supabase
    .from("shared_files")
    .select("storage_path")
    .eq("id", fileId)
    .single();

  if (row?.storage_path) {
    await supabase.storage.from("portal-files").remove([row.storage_path]);
  }

  await supabase.from("shared_files").delete().eq("id", fileId);
  return NextResponse.json({ ok: true });
}
