import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check if a user has Pro status in the database.
 * Used server-side to gate Pro-only API endpoints.
 */
export async function checkProStatus(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", userId)
      .single();

    return profile?.is_pro ?? false;
  } catch (error) {
    console.error("Failed to check Pro status:", error);
    return false;
  }
}

/**
 * Middleware to enforce Pro-only access on API routes.
 * Returns 403 if user is not Pro.
 */
export async function requirePro(
  userId: string,
  supabase: SupabaseClient
): Promise<NextResponse | null> {
  const isPro = await checkProStatus(userId, supabase);

  if (!isPro) {
    return NextResponse.json(
      { error: "This feature requires a Pro subscription" },
      { status: 403 }
    );
  }

  return null; // User is Pro, continue
}

/**
 * List of Pro-only features that should be gated server-side.
 * Update this when adding new Pro features.
 */
export const PRO_FEATURES = {
  MULTI_CURRENCY: "multi_currency",
  SAFE_TO_SPEND: "safe_to_spend",
  TAX_ESTIMATES: "tax_estimates",
  ADVANCED_ANALYTICS: "advanced_analytics",
  CLIENT_PORTALS: "client_portals",
  RECURRING_INVOICES: "recurring_invoices",
  PAYMENT_REMINDERS: "payment_reminders",
  MULTIPLE_CONNECTIONS: "multiple_connections",
  WEBHOOK_INTEGRATIONS: "webhook_integrations",
} as const;
