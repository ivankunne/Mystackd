// TODO: Install stripe SDK: npm install stripe
// import Stripe from 'stripe'
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

import type { IncomeEntry } from "../mock-data";

export interface StripeConnectConfig {
  clientId: string; // STRIPE_CONNECT_CLIENT_ID env var
  redirectUri: string; // Your OAuth callback URL
}

/**
 * TODO: Build the Stripe Connect OAuth URL and redirect the user.
 * Real implementation:
 *   const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_only&redirect_uri=${redirectUri}`
 *   redirect(url)
 */
export function getStripeConnectUrl(config: StripeConnectConfig): string {
  // TODO: implement
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    scope: "read_only",
    redirect_uri: config.redirectUri,
  });
  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

/**
 * TODO: Exchange OAuth code for access token.
 * Real implementation:
 *   const response = await stripe.oauth.token({ grant_type: 'authorization_code', code })
 *   Save response.access_token to DB for this user.
 */
export async function exchangeStripeOAuthCode(
  code: string
): Promise<{ accessToken: string; accountId: string }> {
  // TODO: POST to https://connect.stripe.com/oauth/token
  throw new Error("TODO: implement Stripe OAuth token exchange");
}

/**
 * TODO: Fetch charges/payments from the connected Stripe account.
 * Real implementation:
 *   const stripe = new Stripe(accessToken)
 *   const charges = await stripe.charges.list({ limit: 100, created: { gte: since } })
 *   return normalizeCharges(charges.data)
 */
export async function fetchStripeTransactions(
  accessToken: string,
  since?: Date
): Promise<Partial<IncomeEntry>[]> {
  // TODO: Call Stripe API with connected account token
  throw new Error("TODO: implement Stripe transaction fetch");
}

/**
 * Normalize a Stripe Charge object into our IncomeEntry format.
 * TODO: Implement this mapping once Stripe SDK is installed.
 */
export function normalizeStripeCharge(charge: Record<string, unknown>): Partial<IncomeEntry> {
  // TODO: map charge fields to IncomeEntry
  return {
    source: "stripe",
    amount: (charge.amount as number) / 100, // Stripe amounts are in cents
    currency: ((charge.currency as string) || "eur").toUpperCase() as "EUR" | "USD" | "GBP" | "NOK",
    date: new Date((charge.created as number) * 1000).toISOString().split("T")[0],
    note: (charge.description as string) ?? "",
    status: "settled",
    externalId: charge.id as string,
  };
}
