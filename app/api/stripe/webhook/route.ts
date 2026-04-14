import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const dynamic = "force-dynamic";

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, supabase: SupabaseClient) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  // Update profile with pro status and subscription ID
  await supabase
    .from("profiles")
    .update({
      is_pro: true,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: session.customer as string,
    })
    .eq("id", userId);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: SupabaseClient) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  // Find user by Stripe customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", subscription.customer as string)
    .single();

  if (profile) {
    await supabase
      .from("profiles")
      .update({
        is_pro: false,
        stripe_subscription_id: null,
      })
      .eq("id", profile.id);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabase: SupabaseClient) {
  // Find user by customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", invoice.customer as string)
    .single();

  if (profile) {
    await supabase
      .from("profiles")
      .update({ is_pro: false })
      .eq("id", profile.id);
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle events
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
          supabase
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabase
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
