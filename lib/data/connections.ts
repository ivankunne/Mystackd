import { createClient } from "../supabase/client";
import { getStripeConnectUrl } from "../api/stripe";
import type { Connection, IncomeSource } from "../mock-data";

const ALL_SOURCES: IncomeSource[] = ["stripe", "paypal", "upwork", "fiverr", "manual"];

function rowToConnection(row: Record<string, unknown>): Connection {
  return {
    source:      row.source as IncomeSource,
    status:      row.status as Connection["status"],
    connectedAt: row.connected_at as string | null,
  };
}

async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) throw new Error("Not authenticated");
  return data.session!.user.id;
}

export async function getConnections(userId?: string): Promise<Connection[]> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .eq("user_id", id);
  if (error) throw new Error(error.message);

  // Ensure all 5 sources are always present (upsert missing ones as disconnected)
  const existing = new Map((data ?? []).map((r) => [r.source, rowToConnection(r as Record<string, unknown>)]));
  return ALL_SOURCES.map((source) =>
    existing.get(source) ?? { source, status: "disconnected" as const, connectedAt: null }
  );
}

export async function connectSource(source: IncomeSource, userId?: string): Promise<Connection> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const connectedAt = new Date().toISOString();
  const connected: Connection = {
    source,
    status: "connected",
    connectedAt,
  };
  const { error } = await supabase
    .from("connections")
    .upsert({ user_id: id, source, status: "connected", connected_at: connectedAt }, { onConflict: "user_id,source" });
  if (error) throw new Error(error.message);
  return connected;
}

export async function getOAuthConnectUrl(source: IncomeSource, userId?: string): Promise<string | null> {
  const id = userId ?? await getCurrentUserId();

  if (source === "stripe") {
    // Get origin from window or fall back to environment variable
    const origin = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return getStripeConnectUrl({
      clientId: process.env.NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID!,
      redirectUri: `${origin}/api/oauth/stripe/callback`,
      userId: id,
    });
  }

  // TODO: Add PayPal, Upwork OAuth URLs here
  return null;
}

export async function disconnectSource(source: IncomeSource, userId?: string): Promise<void> {
  const supabase = createClient();
  const id = userId ?? await getCurrentUserId();
  const { error } = await supabase
    .from("connections")
    .upsert({ user_id: id, source, status: "disconnected", connected_at: null }, { onConflict: "user_id,source" });
  if (error) throw new Error(error.message);
}

export async function syncSource(
  source: IncomeSource,
  userId?: string,
): Promise<{ synced: number }> {
  // Real sync requires platform OAuth tokens — implement per-platform when ready
  return { synced: 0 };
}
