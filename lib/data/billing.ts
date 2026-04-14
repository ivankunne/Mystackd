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
      const data = await response.json() as Subscription;
      return data;
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
  if (!response.ok) {
    const errorData = await response.json() as { error?: string; code?: string };
    const error = new Error(errorData.error || "Failed to create checkout session");
    Object.assign(error, { code: errorData.code });
    throw error;
  }
  const data = await response.json() as { url: string };
  return data;
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
  const data = await response.json() as { url: string };
  return data;
}

export interface Invoice {
  id: string;
  number: string | null;
  status: string;
  amount: number;
  currency: string;
  date: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

export async function getInvoices(userId: string): Promise<Invoice[]> {
  const response = await fetch("/api/stripe/invoices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error("Failed to fetch invoices");
  const data = await response.json() as { invoices?: Invoice[] };
  return data.invoices ?? [];
}

export interface SubscriptionDetails {
  planType: "monthly" | "annual" | null;
  renewalDate: string | null;
  currentPrice: number | null;
  status: string | null;
  cancelAtPeriodEnd: boolean;
  cancelDate: string | null;
  paymentMethodLast4: string | null;
  paymentMethodBrand: string | null;
}

export async function getSubscriptionDetails(
  userId: string,
): Promise<SubscriptionDetails> {
  const response = await fetch("/api/stripe/subscription-details", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error("Failed to fetch subscription details");
  const data = await response.json() as SubscriptionDetails;
  return data;
}
