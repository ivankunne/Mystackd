import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const dynamic = "force-dynamic";

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export async function POST(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase configuration");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  try {
    const { userId, userEmail, priceId } = await req.json();

    // Validate required fields
    if (!userId || !userEmail || !priceId) {
      return NextResponse.json(
        { error: "Missing required fields: userId, userEmail, priceId" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(userEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate user exists in Supabase
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile not found for user:", userId);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    let customerId = profile.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      try {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { userId },
        });
        customerId = customer.id;

        // Save customer ID to profiles
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);

        if (updateError) {
          console.error("Failed to save customer ID:", updateError);
          throw new Error("Failed to save customer information");
        }
      } catch (stripeError) {
        console.error("Failed to create Stripe customer:", stripeError);
        return NextResponse.json(
          { error: "Failed to create customer account" },
          { status: 500 }
        );
      }
    }

    // Create checkout session
    try {
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/welcome?plan=${billingPeriod}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/upgrade`,
        metadata: { userId },
      });

      if (!session.url) {
        throw new Error("No checkout URL returned from Stripe");
      }

      return NextResponse.json({ url: session.url });
    } catch (checkoutError) {
      console.error("Failed to create checkout session:", checkoutError);
      const errorCode = (checkoutError as any)?.code || "api_error";
      const errorMessage = (checkoutError as any)?.message || "Failed to create checkout session";
      return NextResponse.json(
        { error: errorMessage, code: errorCode },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected checkout error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
