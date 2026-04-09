// TODO: Use PayPal REST SDK or direct API calls
// PayPal REST API base: https://api-m.paypal.com

import type { IncomeEntry } from "../mock-data";

export interface PayPalOAuthConfig {
  clientId: string; // PAYPAL_CLIENT_ID env var
  clientSecret: string; // PAYPAL_CLIENT_SECRET env var
  redirectUri: string; // Your OAuth callback URL
}

/**
 * TODO: Build the PayPal OAuth 2.0 authorization URL.
 * Scopes needed: openid profile email https://uri.paypal.com/services/paypalattributes
 * Real implementation:
 *   const url = `https://www.paypal.com/signin/authorize?flowEntry=static&client_id=${clientId}&scope=openid+profile+email&redirect_uri=${redirectUri}`
 */
export function getPayPalConnectUrl(config: PayPalOAuthConfig): string {
  // TODO: implement
  const params = new URLSearchParams({
    flowEntry: "static",
    client_id: config.clientId,
    scope: "openid profile email",
    redirect_uri: config.redirectUri,
    response_type: "code",
  });
  return `https://www.paypal.com/signin/authorize?${params.toString()}`;
}

/**
 * TODO: Exchange authorization code for access + refresh tokens.
 * POST https://api-m.paypal.com/v1/oauth2/token
 * Body: grant_type=authorization_code&code={code}&redirect_uri={redirectUri}
 * Auth: Basic base64(clientId:clientSecret)
 */
export async function exchangePayPalOAuthCode(
  code: string,
  config: PayPalOAuthConfig
): Promise<{ accessToken: string; refreshToken: string }> {
  // TODO: POST to PayPal token endpoint
  throw new Error("TODO: implement PayPal OAuth token exchange");
}

/**
 * TODO: Fetch transactions from PayPal Transactions API.
 * GET https://api-m.paypal.com/v1/reporting/transactions
 * Query: start_date, end_date, fields=all&page_size=500
 */
export async function fetchPayPalTransactions(
  accessToken: string,
  startDate: string,
  endDate: string
): Promise<Partial<IncomeEntry>[]> {
  // TODO: Call PayPal Transactions API
  throw new Error("TODO: implement PayPal transaction fetch");
}

/**
 * Normalize a PayPal transaction detail object into our IncomeEntry format.
 * TODO: Implement once API is integrated.
 */
export function normalizePayPalTransaction(
  tx: Record<string, unknown>
): Partial<IncomeEntry> {
  // TODO: map PayPal transaction fields to IncomeEntry
  const info = tx.transaction_info as Record<string, unknown>;
  const amount = info?.transaction_amount as Record<string, unknown>;
  return {
    source: "paypal",
    amount: parseFloat((amount?.value as string) ?? "0"),
    currency: ((amount?.currency_code as string) || "EUR") as "EUR" | "USD" | "GBP" | "NOK",
    date: (info?.transaction_initiation_date as string)?.split("T")[0] ?? "",
    note: (info?.transaction_note as string) ?? "",
    status: "settled",
    externalId: info?.transaction_id as string,
  };
}
