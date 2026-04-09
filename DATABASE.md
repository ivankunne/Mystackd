# MyStackd — Database Schema

This document describes the full Supabase/PostgreSQL schema for production implementation.

---

## Tables

### `users`
Stores user profile data. One row per authenticated user (linked to `auth.users`).

```sql
CREATE TABLE public.users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  country      TEXT NOT NULL DEFAULT 'NO',
  currency     TEXT NOT NULL DEFAULT 'EUR' CHECK (currency IN ('EUR','USD','GBP','NOK','SEK','DKK')),
  tax_bracket  NUMERIC(5,4) NOT NULL DEFAULT 0.25,
  is_pro       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own row"
  ON public.users FOR ALL USING (auth.uid() = id);
```

### `monthly_expenses`
Monthly expense breakdown per user.

```sql
CREATE TABLE public.monthly_expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rent            NUMERIC(10,2) NOT NULL DEFAULT 0,
  subscriptions   NUMERIC(10,2) NOT NULL DEFAULT 0,
  other           NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.monthly_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own expenses"
  ON public.monthly_expenses FOR ALL USING (auth.uid() = user_id);
```

### `income_entries`
All income transactions, regardless of source.

```sql
CREATE TABLE public.income_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source          TEXT NOT NULL CHECK (source IN ('stripe','paypal','upwork','fiverr','manual')),
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL CHECK (currency IN ('EUR','USD','GBP','NOK','SEK','DKK')),
  date            DATE NOT NULL,
  note            TEXT,
  status          TEXT NOT NULL DEFAULT 'settled' CHECK (status IN ('settled','pending','refunded')),
  external_id     TEXT,                       -- e.g. Stripe charge ID, PayPal transaction ID
  raw_payload     JSONB,                      -- Store original API response for debugging
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source, external_id)       -- Prevent duplicate syncs
);

CREATE INDEX income_entries_user_date ON public.income_entries (user_id, date DESC);
CREATE INDEX income_entries_source ON public.income_entries (user_id, source);

ALTER TABLE public.income_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own income"
  ON public.income_entries FOR ALL USING (auth.uid() = user_id);
```

### `connections`
OAuth tokens and connection state per source per user.

```sql
CREATE TABLE public.connections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source              TEXT NOT NULL CHECK (source IN ('stripe','paypal','upwork','fiverr','manual')),
  status              TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','disconnected')),
  access_token        TEXT,                   -- Encrypted at rest via Supabase Vault
  refresh_token       TEXT,                   -- Encrypted
  token_expires_at    TIMESTAMPTZ,
  account_id          TEXT,                   -- e.g. Stripe account ID, PayPal email
  connected_at        TIMESTAMPTZ,
  last_synced_at      TIMESTAMPTZ,
  sync_cursor         TEXT,                   -- Store last sync position (e.g. Stripe charge ID)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source)
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own connections"
  ON public.connections FOR ALL USING (auth.uid() = user_id);
```

### `subscriptions`
Billing/subscription state per user (managed via Stripe webhooks).

```sql
CREATE TABLE public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan_id               TEXT NOT NULL DEFAULT 'free' CHECK (plan_id IN ('free','pro')),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','past_due','trialing')),
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cancel_at_period_end  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only read their own subscription"
  ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
-- Writes handled by service role via Stripe webhooks only
```

---

## Triggers

```sql
-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Edge Functions (Supabase)

| Function | Trigger | Purpose |
|---|---|---|
| `stripe-webhook` | POST /stripe/webhook | Handle Stripe events (payment, subscription changes) |
| `sync-stripe` | Manual / CRON | Pull new Stripe charges for connected accounts |
| `sync-paypal` | Manual / CRON | Pull new PayPal transactions |
| `sync-upwork` | Manual / CRON | Pull new Upwork earnings |

---

## Storage Buckets

| Bucket | Purpose |
|---|---|
| `fiverr-uploads` | Temporary storage for Fiverr CSV uploads (auto-deleted after parse) |

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_CLIENT_ID=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

UPWORK_CONSUMER_KEY=
UPWORK_CONSUMER_SECRET=
```
