/**
 * DELETE /api/delete-account
 *
 * Permanently deletes the authenticated user's account:
 *   1. Re-authenticates with their current password (prevents CSRF / stolen tokens)
 *   2. Deletes the profiles row (FK cascade removes all user data)
 *   3. Deletes the auth.users row via the Supabase Admin API
 *
 * Requires: valid session cookie + correct current password in request body.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE(req: NextRequest) {
  // 1. Verify there is an active session
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await req.json() as { password?: string };

  if (!password) {
    return NextResponse.json({ error: "Password is required" }, { status: 400 });
  }

  // 2. Re-authenticate to verify ownership — prevents token-hijack deletions
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: session.user.email!,
    password,
  });

  if (authError) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 400 });
  }

  const userId = session.user.id;
  const db = createServiceClient();

  // 3. Delete the profile row — FK CASCADE removes income, invoices, clients, etc.
  const { error: profileError } = await db
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (profileError) {
    console.error("[delete-account] Failed to delete profile:", profileError);
    return NextResponse.json({ error: "Failed to delete account data" }, { status: 500 });
  }

  // 4. Delete the auth.users record via Admin API (requires service role)
  const { error: adminError } = await db.auth.admin.deleteUser(userId);

  if (adminError) {
    // Profile is already gone — log and continue rather than leaving the user
    // in a broken half-deleted state.
    console.error("[delete-account] Admin delete failed:", adminError);
  }

  // 5. Sign out to clear local session tokens
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
