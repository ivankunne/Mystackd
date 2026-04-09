// TODO: Upwork uses OAuth 1.0a — requires oauth-1.0a package
// npm install oauth-1.0a
// Upwork API docs: https://developers.upwork.com/

import type { IncomeEntry } from "../mock-data";

export interface UpworkOAuthConfig {
  consumerKey: string; // UPWORK_CONSUMER_KEY env var
  consumerSecret: string; // UPWORK_CONSUMER_SECRET env var
  callbackUrl: string;
}

/**
 * TODO: Upwork uses OAuth 1.0a (not 2.0).
 * Step 1: GET https://www.upwork.com/api/auth/v1/oauth/token/request
 * Step 2: Redirect to https://www.upwork.com/services/api/auth?oauth_token={token}
 * Step 3: Exchange verifier for access token
 */
export async function getUpworkRequestToken(
  config: UpworkOAuthConfig
): Promise<{ requestToken: string; requestTokenSecret: string }> {
  // TODO: implement OAuth 1.0a request token step
  throw new Error("TODO: implement Upwork OAuth 1.0a request token");
}

/**
 * TODO: Exchange OAuth verifier for access token.
 * POST https://www.upwork.com/api/auth/v1/oauth/token/access
 */
export async function exchangeUpworkVerifier(
  requestToken: string,
  requestTokenSecret: string,
  verifier: string,
  config: UpworkOAuthConfig
): Promise<{ accessToken: string; accessTokenSecret: string }> {
  // TODO: implement OAuth 1.0a access token exchange
  throw new Error("TODO: implement Upwork OAuth 1.0a access token exchange");
}

/**
 * TODO: Fetch engagement earnings from Upwork.
 * GET https://www.upwork.com/api/hr/v2/engagements.json
 * Or: https://www.upwork.com/api/hr/v3/contracts/{contractId}/hours
 * Or: Reports API: https://www.upwork.com/api/timereports/v1/providers/{providerID}/hours.json
 */
export async function fetchUpworkEarnings(
  accessToken: string,
  accessTokenSecret: string,
  config: UpworkOAuthConfig
): Promise<Partial<IncomeEntry>[]> {
  // TODO: Call Upwork API with OAuth 1.0a signed request
  throw new Error("TODO: implement Upwork earnings fetch");
}

/**
 * Normalize an Upwork engagement/payment record into our IncomeEntry format.
 * TODO: Implement once API is integrated.
 */
export function normalizeUpworkPayment(
  payment: Record<string, unknown>
): Partial<IncomeEntry> {
  // TODO: map Upwork payment fields to IncomeEntry
  return {
    source: "upwork",
    amount: parseFloat((payment.amount as string) ?? "0"),
    currency: "USD", // Upwork pays in USD by default
    date: payment.date as string,
    note: (payment.description as string) ?? "",
    status: "settled",
    externalId: payment.reference as string,
  };
}
