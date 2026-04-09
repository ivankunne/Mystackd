import { createClient } from "../supabase/client";

export interface Subscription {
  planId:             "free" | "pro";
  status:             "active" | "canceled" | "past_due" | "trialing";
  currentPeriodEnd:   string | null;
  cancelAtPeriodEnd:  boolean;
  pricePerMonth:      number;
}

const FREE_PLAN: Subscription = {
  planId:            "free",
  status:            "active",
  currentPeriodEnd:  null,
  cancelAtPeriodEnd: false,
  pricePerMonth:     0,
};

export async function getSubscription(userId?: string): Promise<Subscription> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return { ...FREE_PLAN };
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_pro")
    .eq("id", data.session!.user.id)
    .single();
  if (!profile?.is_pro) return { ...FREE_PLAN };
  return {
    planId:            "pro",
    status:            "active",
    currentPeriodEnd:  null,
    cancelAtPeriodEnd: false,
    pricePerMonth:     9,
  };
}

export async function createCheckoutSession(
  userId?: string,
  userEmail?: string,
): Promise<{ url: string }> {
  // TODO: Replace with Stripe Checkout session via API route
  return { url: "#" };
}

export async function cancelSubscription(userId?: string): Promise<void> {
  // TODO: Replace with Stripe cancel subscription via API route
}

export async function createBillingPortalSession(
  userId?: string,
): Promise<{ url: string }> {
  // TODO: Replace with Stripe Customer Portal session via API route
  return { url: "#" };
}
