import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { Subscription } from "@/lib/data/billing";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const dynamic = "force-dynamic";

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

    // Get user's subscription info from profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro, stripe_subscription_id")
      .eq("id", userId)
      .single();

    if (!profile?.is_pro || !profile.stripe_subscription_id) {
      // User is not Pro or has no subscription
      return NextResponse.json({
        planId: "free",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        pricePerMonth: 0,
      } as Subscription);
    }

    try {
      // Fetch subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(
        profile.stripe_subscription_id
      );

      const currentPeriodEnd = new Date(
        subscription.current_period_end * 1000
      ).toISOString();

      return NextResponse.json({
        planId: "pro",
        status: subscription.status as "active" | "canceled" | "past_due" | "trialing",
        currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        pricePerMonth: subscription.items.data[0]?.price?.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : 9,
      } as Subscription);
    } catch (stripeError) {
      console.error("Failed to fetch Stripe subscription:", stripeError);
      // If Stripe fetch fails, return basic Pro info
      return NextResponse.json({
        planId: "pro",
        status: "active",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        pricePerMonth: 9,
      } as Subscription);
    }
  } catch (error) {
    console.error("Subscription fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
