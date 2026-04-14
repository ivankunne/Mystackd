import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import { generateUpgradeConfirmationEmail, generateCancellationConfirmationEmail } from "@/lib/email-templates";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const dynamic = "force-dynamic";

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session, supabase: SupabaseClient) {
  const userId = session.metadata?.userId;
  if (!userId || !session.subscription || !session.customer) return;

  const subscription = await stripe.subscriptions.retrieve(
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id
  ) as any;

  // Update profile with pro status and subscription ID
  await supabase
    .from("profiles")
    .update({
      is_pro: true,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer.id,
    })
    .eq("id", userId);

  // Send confirmation email
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .single();

    if (profile?.email) {
      const planItem = subscription.items.data[0];
      const planType = planItem?.price?.recurring?.interval === "year" ? "annual" : "monthly";
      const amount = planItem?.price?.unit_amount ? planItem.price.unit_amount / 100 : (planType === "monthly" ? 9 : 79);

      const emailData = generateUpgradeConfirmationEmail(
        profile.name || "User",
        planType,
        amount,
        new Date(subscription.current_period_end * 1000).toISOString()
      );

      await sendEmail({
        to: profile.email,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      }).catch(err => console.error("Failed to send upgrade confirmation email:", err));
    }
  } catch (error) {
    console.error("Error sending upgrade confirmation email:", error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: SupabaseClient) {
  const userId = subscription.metadata?.userId;
  if (!userId || !subscription.customer) return;

  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  // Find user by Stripe customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name")
    .eq("stripe_customer_id", customerId)
    .single();

  if (profile) {
    await supabase
      .from("profiles")
      .update({
        is_pro: false,
        stripe_subscription_id: null,
      })
      .eq("id", profile.id);

    // Send cancellation email
    try {
      if (profile.email) {
        const emailData = generateCancellationConfirmationEmail(
          profile.name || "User",
          new Date(subscription.ended_at ? subscription.ended_at * 1000 : Date.now()).toISOString()
        );

        await sendEmail({
          to: profile.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        }).catch(err => console.error("Failed to send cancellation email:", err));
      }
    } catch (error) {
      console.error("Error sending cancellation email:", error);
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabase: SupabaseClient) {
  if (!invoice.customer) return;

  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer.id;

  // Find user by customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
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

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Check if we've already processed this event (idempotency)
    const { data: existingEvent } = await supabase
      .from("stripe_webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .single();

    if (existingEvent) {
      console.log(`Event ${event.id} already processed, skipping`);
      return NextResponse.json({ received: true });
    }

    // Record that we're processing this event
    try {
      await supabase
        .from("stripe_webhook_events")
        .insert({ stripe_event_id: event.id, event_type: event.type, processed_at: new Date().toISOString() });
    } catch (err) {
      console.error("Failed to record webhook event:", err);
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

      default:
        console.log(`Unhandled event type: ${event.type}`);
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
