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
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

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
      });
    }

    // Fetch raw objects from Stripe
    const subData = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
    const custData = profile.stripe_customer_id ? await stripe.customers.retrieve(profile.stripe_customer_id) : null;

    // Manually extract data to avoid type issues
    const planItem = (subData as any).items?.data?.[0];
    const planType = planItem?.price?.recurring?.interval === "year" ? "annual" : planItem?.price?.recurring?.interval === "month" ? "monthly" : null;
    const currentPrice = planItem?.price?.unit_amount ? planItem.price.unit_amount / 100 : null;
    const renewalDate = (subData as any).current_period_end ? new Date((subData as any).current_period_end * 1000).toISOString() : null;
    const status = (subData as any).status;
    const cancelAtPeriodEnd = (subData as any).cancel_at_period_end || false;
    const cancelDate = (subData as any).canceled_at ? new Date((subData as any).canceled_at * 1000).toISOString() : null;

    let paymentMethodLast4: string | null = null;
    let paymentMethodBrand: string | null = null;

    // Try new-style payment method
    if ((subData as any).default_payment_method && typeof (subData as any).default_payment_method === "string") {
      try {
        const pm = await stripe.paymentMethods.retrieve((subData as any).default_payment_method);
        if ((pm as any).card) {
          paymentMethodLast4 = (pm as any).card.last4;
          paymentMethodBrand = (pm as any).card.brand;
        }
      } catch (error) {
        console.error("Failed to fetch payment method:", error);
      }
    }

    // Try old-style source as fallback
    if (!paymentMethodLast4 && custData && (custData as any).deleted !== true && (subData as any).default_source && typeof (subData as any).default_source === "string") {
      try {
        const pm = await stripe.customers.retrieveSource(profile.stripe_customer_id!, (subData as any).default_source);
        if ((pm as any).last4) {
          paymentMethodLast4 = (pm as any).last4;
          if ((pm as any).brand) {
            paymentMethodBrand = (pm as any).brand;
          }
        }
      } catch (error) {
        console.error("Failed to fetch source:", error);
      }
    }

    const details: SubscriptionDetails = {
      planType,
      renewalDate,
      currentPrice,
      status,
      cancelAtPeriodEnd,
      cancelDate,
      paymentMethodLast4,
      paymentMethodBrand,
    };

    return NextResponse.json(details);
  } catch (error) {
    console.error("Failed to fetch subscription details:", error);
    return NextResponse.json({ error: "Failed to fetch subscription details" }, { status: 500 });
  }
}
