# MyStackd — Integration Guide

Documentation for all income source integrations: Stripe Connect, PayPal OAuth, Upwork API, and Fiverr CSV.

---

## 1. Stripe Connect

### Overview
Stripe Connect allows MyStackd to read payment data from users' Stripe accounts without storing credentials. We use **OAuth with `read_only` scope**.

### Setup
1. Create a Stripe Connect application at https://dashboard.stripe.com/settings/connect
2. Set your OAuth redirect URL: `https://yourdomain.com/api/oauth/stripe/callback`
3. Add env vars: `STRIPE_CONNECT_CLIENT_ID`, `STRIPE_SECRET_KEY`

### OAuth Flow
```
1. User clicks "Connect Stripe"
   → Redirect to: https://connect.stripe.com/oauth/authorize
     ?response_type=code
     &client_id={STRIPE_CONNECT_CLIENT_ID}
     &scope=read_only
     &redirect_uri={REDIRECT_URI}

2. Stripe redirects back with ?code=...
   → POST to https://connect.stripe.com/oauth/token
     grant_type=authorization_code
     code={code}
   ← Returns: access_token, stripe_user_id

3. Save access_token to connections table (encrypted)
```

### Syncing Data
```typescript
// Fetch charges using connected account token
const stripe = new Stripe(accessToken);
const charges = await stripe.charges.list({
  limit: 100,
  created: { gte: Math.floor(lastSyncedAt.getTime() / 1000) },
});
// Filter: charge.paid === true && charge.refunded === false
// Upsert to income_entries using charge.id as external_id
```

### Webhook Events to Handle
| Event | Action |
|---|---|
| `charge.succeeded` | Add income entry |
| `charge.refunded` | Update status to 'refunded' |
| `account.application.deauthorized` | Update connection to 'disconnected' |

---

## 2. PayPal OAuth

### Overview
PayPal uses OAuth 2.0 with the Payments API to fetch transaction history.

### Setup
1. Create app at https://developer.paypal.com/dashboard/applications
2. Enable "Transaction Search" permissions
3. Set redirect URI: `https://yourdomain.com/api/oauth/paypal/callback`
4. Add env vars: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`

### OAuth Flow
```
1. User clicks "Connect PayPal"
   → Redirect to: https://www.paypal.com/signin/authorize
     ?flowEntry=static
     &client_id={PAYPAL_CLIENT_ID}
     &scope=openid+https://uri.paypal.com/services/paypalattributes
     &redirect_uri={REDIRECT_URI}
     &response_type=code

2. PayPal redirects back with ?code=...
   → POST https://api-m.paypal.com/v1/oauth2/token
     Authorization: Basic base64(clientId:clientSecret)
     Body: grant_type=authorization_code&code={code}
   ← Returns: access_token, refresh_token

3. Save tokens (encrypted) to connections table
```

### Syncing Transactions
```typescript
// GET https://api-m.paypal.com/v1/reporting/transactions
// Headers: Authorization: Bearer {accessToken}
// Query: start_date=ISO&end_date=ISO&fields=all&page_size=500

// Filter by:
// transaction_info.transaction_status === 'S' (success)
// transaction_info.transaction_type === 'T' (transfer/payment)
```

### Token Refresh
PayPal access tokens expire after 8 hours. Use the refresh_token to get a new one:
```
POST https://api-m.paypal.com/v1/oauth2/token
grant_type=refresh_token&refresh_token={refreshToken}
```

---

## 3. Upwork API

### Overview
Upwork uses **OAuth 1.0a** (not 2.0). Requires `oauth-1.0a` npm package.

### Setup
1. Create app at https://www.upwork.com/services/api/apply
2. Note your Consumer Key and Consumer Secret
3. Add env vars: `UPWORK_CONSUMER_KEY`, `UPWORK_CONSUMER_SECRET`

### OAuth 1.0a Flow
```
Step 1 — Get Request Token:
  GET https://www.upwork.com/api/auth/v1/oauth/token/request
  (OAuth 1.0a signed request)
  ← Returns: oauth_token, oauth_token_secret

Step 2 — User Authorization:
  Redirect to: https://www.upwork.com/services/api/auth
    ?oauth_token={oauth_token}
  ← User authorizes, redirected with oauth_verifier

Step 3 — Exchange for Access Token:
  POST https://www.upwork.com/api/auth/v1/oauth/token/access
  (OAuth 1.0a signed with request token + verifier)
  ← Returns: access_token, access_token_secret

Step 4 — Save tokens to connections table (encrypted)
```

### Fetching Earnings
```typescript
// Timereports API (requires OAuth 1.0a signing on every request)
// GET https://www.upwork.com/api/timereports/v1/providers/{providerID}/hours.json
// Query: tq=select+worked_on,charge_amount,charge_currency where worked_on>='YYYY-MM-DD'

// Or Financial Reports:
// GET https://www.upwork.com/api/finance/v2/accountancy/incremental/{providerId}.json
```

### Notes
- Upwork API rate limits: ~100 requests/10 minutes
- Provider ID is returned during OAuth as `userinfo.uid`
- All Upwork payouts are in USD

---

## 4. Fiverr CSV Import

### Overview
Fiverr does **not** provide a public API for earnings data. Integration is via CSV export from the Fiverr seller dashboard.

### User Instructions
1. Log into Fiverr
2. Go to **Selling → Analytics → Earnings**
3. Click **Export to CSV**
4. Upload the downloaded CSV file in MyStackd → Connections → Fiverr

### CSV Format
Fiverr CSV fields (may vary by region/account type):
```
Date, Type, Order ID, Description, Amount, Currency, Net Amount
```

### Parsing Implementation
See `/lib/api/fiverr.ts` for the full PapaParse-based implementation.

```typescript
import Papa from 'papaparse';
import { parseFiverrCsv } from '@/lib/api/fiverr';

// In your upload handler:
const text = await file.text();
const entries = parseFiverrCsv(text, Papa);
// Upsert to income_entries, deduplicating by Order ID
```

### Deduplication
Use `Order ID` as `external_id` in the `income_entries` table. The unique constraint on `(user_id, source, external_id)` prevents duplicates on re-upload.

---

## Integration Status Summary

| Source | Method | Status |
|--------|--------|--------|
| Stripe | OAuth 2.0 (read_only) | Stubbed — ready to implement |
| PayPal | OAuth 2.0 + Transactions API | Stubbed — ready to implement |
| Upwork | OAuth 1.0a | Stubbed — requires `oauth-1.0a` package |
| Fiverr | CSV upload + PapaParse | Parse logic implemented, UI wiring needed |
| Manual | Direct entry via form | Fully working |

---

## Security Considerations

1. **Token storage**: All OAuth tokens stored encrypted in Supabase Vault (never in plain text)
2. **Scopes**: Request only read-only scopes — we never write to users' accounts
3. **Webhooks**: Validate Stripe webhook signatures using `stripe.webhooks.constructEvent()`
4. **RLS**: Row Level Security ensures users can only access their own data
5. **Server-only**: All API keys and tokens only used in server-side code / Edge Functions
