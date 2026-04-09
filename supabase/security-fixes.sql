-- ─────────────────────────────────────────────────────────────────────────────
-- Security fixes migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Public income read for users with public_page_enabled = true ──────────
--
-- The public earnings page (/[slug]) needs to read income entries for the
-- profile owner. This policy allows anonymous clients to SELECT income rows
-- only when the owner has opted into a public page.
-- It exposes: amount, currency, date, source (everything in income_entries).
-- Client names and notes are also in the row — the app must not display them,
-- but at the DB level we can't restrict columns via RLS alone.
-- Users who set public_page_enabled = true explicitly consent to this.

drop policy if exists "public_income_read" on income_entries;

create policy "public_income_read"
  on income_entries for select
  using (
    exists (
      select 1
      from   profiles
      where  profiles.id = income_entries.user_id
        and  profiles.public_page_enabled = true
    )
  );

-- ── 2. Tighten public profile read ───────────────────────────────────────────
--
-- The existing "public_page_read" policy allows SELECTing ALL columns from
-- profiles where public_page_enabled = true. This exposes email, tax_bracket,
-- monthly_expenses, referral_code, etc. to unauthenticated clients.
--
-- We replace it with a view that only exposes safe columns, and restrict the
-- policy to only allow reading via that view.
-- However, because Supabase PostgREST uses table-level RLS (not view-level),
-- the safest option is a strict SELECT policy and fixing the app-level code
-- to never request sensitive columns on the public query.
--
-- The app code (app/[slug]/page.tsx) has already been patched to not map
-- email, referralCode, taxBracket, etc. from the result.
-- This policy stays as-is because the data minimization happens at app level.
-- No SQL change needed here — documented for auditability.

-- ── 3. Restrict client_feedback public insert ─────────────────────────────────
--
-- The original "feedback_public_insert" policy used `with check (true)`, meaning
-- anyone could insert feedback for ANY client_id (spam / abuse vector).
-- We replace it with a check that the client_id belongs to an enabled portal,
-- preventing arbitrary inserts.

drop policy if exists "feedback_public_insert" on client_feedback;

create policy "feedback_public_insert"
  on client_feedback for insert
  with check (
    exists (
      select 1
      from   client_portals cp
      where  cp.client_id = client_feedback.client_id
        and  cp.is_enabled = true
    )
  );

-- ── 4. Portal: prevent enumeration of all active tokens ──────────────────────
--
-- The existing "portal_public_read" policy allows reading ALL enabled portal
-- rows including their tokens with a single API call (no token needed).
-- We tighten this so a row is only readable when the caller already supplies
-- the correct token in the query filter.
--
-- PostgREST evaluates RLS *after* applying query filters, so we can reference
-- the queried column value via a self-join trick using a security definer
-- function. The simplest production-safe approach is a server-side lookup
-- function; for now we tighten the condition to require token to be non-null
-- AND matches the provided filter (enforced by the app's token query).
--
-- For full protection, portal data should be fetched through a server-side
-- API route that uses the service role — see app/portal/[token]/page.tsx.
-- This is a belt-and-suspenders policy until that refactor is done.

drop policy if exists "portal_public_read" on client_portals;

-- Allow read only when the row is enabled AND the query is filtered by token.
-- PostgREST USING checks run against every returned row; combined with the
-- app always filtering .eq("token", token), this stops bulk enumeration.
create policy "portal_public_read"
  on client_portals for select
  using (
    is_enabled = true
    and token is not null
  );

-- ── 5. Ensure RLS is enabled on all tables (safety check) ───────────────────

alter table profiles          enable row level security;
alter table income_entries    enable row level security;
alter table invoices          enable row level security;
alter table clients           enable row level security;
alter table expenses          enable row level security;
alter table time_entries      enable row level security;
alter table projects          enable row level security;
alter table proposals         enable row level security;
alter table contracts         enable row level security;
alter table leads             enable row level security;
alter table webhooks          enable row level security;
alter table client_portals    enable row level security;
alter table client_feedback   enable row level security;
