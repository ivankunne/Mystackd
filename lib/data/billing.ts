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
    .select("is_pro, stripe_subscription_id")
    .eq("id", data.session!.user.id)
    .single();

  if (!profile?.is_pro) return { ...FREE_PLAN };

  // If user is Pro, try to fetch real subscription data from the server
  // This will get the actual renewal date and subscription details
  try {
    const response = await fetch("/api/stripe/subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: data.session!.user.id }),
    });

    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.error("Failed to fetch subscription data:", error);
  }

  // Fallback to basic Pro plan data if server call fails
  return {
    planId:            "pro",
    status:            "active",
    currentPeriodEnd:  null,
    cancelAtPeriodEnd: false,
    pricePerMonth:     9,
  };
}

export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  priceId: string,
): Promise<{ url: string }> {
  const response = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, userEmail, priceId }),
  });
  if (!response.ok) throw new Error("Failed to create checkout session");
  return response.json();
}

export async function cancelSubscription(userId: string): Promise<void> {
  // Redirect to billing portal where user can cancel
  const { url } = await createBillingPortalSession(userId);
  if (url) window.location.href = url;
}

export async function createBillingPortalSession(
  userId: string,
): Promise<{ url: string }> {
  const response = await fetch("/api/stripe/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error("Failed to create billing portal session");
  return response.json();
}
