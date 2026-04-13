import Stripe from "stripe";
import type { IncomeEntry } from "../mock-data";

export interface StripeConnectConfig {
  clientId: string;
  redirectUri: string;
  userId: string;
}

export function getStripeConnectUrl(config: StripeConnectConfig): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    scope: "read_write",
    state: config.userId,
    stripe_landing: "login",
    redirect_uri: config.redirectUri,
  });
  return `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
}

export async function fetchStripeTransactions(
  accessToken: string,
  since?: Date
): Promise<Partial<IncomeEntry>[]> {
  try {
    const stripeClient = new Stripe(accessToken);
    const charges = await stripeClient.charges.list({
      limit: 100,
      created: since
        ? { gte: Math.floor(since.getTime() / 1000) }
        : undefined,
    });

    return charges.data
      .filter((charge) => charge.paid && !charge.refunded)
      .map((charge) => normalizeStripeCharge(charge));
  } catch (error) {
    console.error("Error fetching Stripe transactions:", error);
    throw error;
  }
}

export function normalizeStripeCharge(
  charge: Stripe.Charge
): Partial<IncomeEntry> {
  return {
    source: "stripe",
    amount: charge.amount / 100,
    currency: (charge.currency.toUpperCase() || "USD") as
      | "EUR"
      | "USD"
      | "GBP"
      | "NOK",
    date: new Date(charge.created * 1000).toISOString().split("T")[0],
    note: charge.description || "",
    status: charge.refunded ? "refunded" : charge.paid ? "settled" : "pending",
    externalId: charge.id,
  };
}
