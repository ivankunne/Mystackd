import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const dynamic = "force-dynamic";

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

export async function POST(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    // Get subscription ID from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_subscription_id, stripe_customer_id")
      .eq("id", userId)
      .single();

    if (!profile?.stripe_subscription_id) {
      return NextResponse.json({
        planType: null,
        renewalDate: null,
        currentPrice: null,
        status: null,
        cancelAtPeriodEnd: false,
        cancelDate: null,
        paymentMethodLast4: null,
        paymentMethodBrand: null,
      } as SubscriptionDetails);
    }

    // Fetch subscription and customer details from Stripe
    const [subscription, customer] = await Promise.all([
      stripe.subscriptions.retrieve(profile.stripe_subscription_id),
      profile.stripe_customer_id
        ? stripe.customers.retrieve(profile.stripe_customer_id)
        : null,
    ]);

    // Determine plan type (monthly or annual)
    const planItem = subscription.items.data[0];
    let planType: "monthly" | "annual" | null = null;
    if (planItem?.price?.recurring?.interval === "month") {
      planType = "monthly";
    } else if (planItem?.price?.recurring?.interval === "year") {
      planType = "annual";
    }

    // Get payment method info
    let paymentMethodLast4: string | null = null;
    let paymentMethodBrand: string | null = null;

    if (customer && typeof customer !== 'boolean' && customer.invoice_settings?.custom_fields) {
      const pm = await stripe.customers.retrieveSource(
        profile.stripe_customer_id!,
        subscription.default_source as string
      ).catch(() => null);

      if (pm && typeof pm === 'object' && 'last4' in pm) {
        paymentMethodLast4 = pm.last4 as string;
        paymentMethodBrand = (pm.brand as string) || null;
      }
    }

    // Try to get payment method from payment method ID
    if (subscription.default_payment_method && typeof subscription.default_payment_method === 'string') {
      try {
        const pm = await stripe.paymentMethods.retrieve(subscription.default_payment_method);
        if (pm.card) {
          paymentMethodLast4 = pm.card.last4;
          paymentMethodBrand = pm.card.brand;
        }
      } catch (error) {
        console.error("Failed to fetch payment method:", error);
      }
    }

    const details: SubscriptionDetails = {
      planType,
      renewalDate: new Date(subscription.current_period_end * 1000).toISOString(),
      currentPrice: planItem?.price?.unit_amount ? planItem.price.unit_amount / 100 : null,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelDate: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      paymentMethodLast4,
      paymentMethodBrand,
    };

    return NextResponse.json(details);
  } catch (error) {
    console.error("Failed to fetch subscription details:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details" },
      { status: 500 }
    );
  }
}
