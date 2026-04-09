import { createClient } from "./supabase/client";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
}

export async function login({ email, password }: LoginCredentials): Promise<AuthUser> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return {
    id: data.user.id,
    email: data.user.email!,
    name: data.user.user_metadata?.name ?? email.split("@")[0],
  };
}

export async function signup({ name, email, password }: SignupCredentials): Promise<AuthUser> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Signup failed — please try again");
  return {
    id: data.user.id,
    email: data.user.email!,
    name,
  };
}

export async function logout(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function loginWithGoogle(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/dashboard` },
  });
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/forgot-password?step=reset`,
  });
  if (error) throw new Error(error.message);
}

export async function changePassword(
  _currentPassword: string,
  newPassword: string,
  _email: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function deleteUserRecord(_email: string): Promise<void> {
  // Full account deletion requires a server-side admin call.
  // For now the profile + all data is cascade-deleted via DB foreign keys
  // when the auth.users row is removed by a Supabase Edge Function or admin API.
}
