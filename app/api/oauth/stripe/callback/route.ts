import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const userId = searchParams.get("state"); // userId passed as state

  if (!code || !userId) {
    return NextResponse.redirect(
      new URL("/connections?error=missing_code", req.url)
    );
  }

  try {
    // 1. Exchange OAuth code for access token
    const tokenResponse = await fetch(
      "https://connect.stripe.com/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_secret: process.env.STRIPE_SECRET_KEY!,
          code,
          grant_type: "authorization_code",
        }).toString(),
      }
    );

    const tokenData = await tokenResponse.json();
    const { access_token, stripe_user_id, error } = tokenData;

    if (error) {
      console.error("Stripe OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/connections?error=${encodeURIComponent(error)}`, req.url)
      );
    }

    // 2. Save connection to database
    const { error: dbError } = await supabase
      .from("connections")
      .upsert(
        {
          user_id: userId,
          source: "stripe",
          status: "connected",
          access_token,
          connected_at: new Date().toISOString(),
        },
        { onConflict: "user_id,source" }
      );

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.redirect(
        new URL("/connections?error=db_error", req.url)
      );
    }

    return NextResponse.redirect(
      new URL("/connections?source=stripe&status=success", req.url)
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/connections?error=callback_failed", req.url)
    );
  }
}
