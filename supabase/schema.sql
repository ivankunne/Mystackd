-- ============================================================
--  MyStackd — Supabase Database Schema
--  Paste this entire file into: Supabase > SQL Editor > New query
-- ============================================================

-- ─── Profiles (one row per auth.users) ───────────────────────────────────────
create table if not exists profiles (
  id                   uuid references auth.users(id) on delete cascade primary key,
  name                 text        not null,
  email                text        not null,
  currency             text        not null default 'EUR',
  country              text        not null default 'NO',
  monthly_expenses     jsonb       not null default '{"rent":0,"subscriptions":0,"other":0}',
  tax_bracket          numeric     not null default 0.33,
  is_pro               boolean     not null default false,
  email_verified       boolean     not null default false,
  income_goal          numeric,
  referral_code        text,
  public_page_enabled  boolean     not null default false,
  public_page_slug     text        unique,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ─── Income entries ───────────────────────────────────────────────────────────
create table if not exists income_entries (
  id                       text        primary key default 'inc_' || replace(gen_random_uuid()::text, '-', ''),
  user_id                  uuid        references profiles(id) on delete cascade not null,
  source                   text        not null check (source in ('stripe','paypal','upwork','fiverr','manual')),
  amount                   numeric     not null,
  currency                 text        not null,
  date                     date        not null,
  note                     text        not null default '',
  status                   text        not null default 'settled' check (status in ('settled','pending','refunded')),
  external_id              text,
  client_name              text,
  project_name             text,
  is_recurring             boolean     not null default false,
  recurring_id             text,
  invoice_id               text,
  amount_in_home_currency  numeric,
  fx_rate                  numeric,
  created_at               timestamptz not null default now()
);

-- ─── Connections ──────────────────────────────────────────────────────────────
create table if not exists connections (
  user_id       uuid references profiles(id) on delete cascade,
  source        text        not null check (source in ('stripe','paypal','upwork','fiverr','manual')),
  status        text        not null default 'disconnected' check (status in ('connected','disconnected')),
  connected_at  timestamptz,
  access_token  text, -- store encrypted in production
  primary key (user_id, source)
);

-- ─── Clients ──────────────────────────────────────────────────────────────────
create table if not exists clients (
  id          text        primary key default 'client_' || replace(gen_random_uuid()::text, '-', ''),
  user_id     uuid        references profiles(id) on delete cascade not null,
  name        text        not null,
  email       text,
  company     text,
  country     text,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
create table if not exists invoices (
  id                      text        primary key default 'inv_' || replace(gen_random_uuid()::text, '-', ''),
  user_id                 uuid        references profiles(id) on delete cascade not null,
  invoice_number          text        not null,
  client_name             text        not null,
  client_email            text,
  client_address          text,
  items                   jsonb       not null default '[]',
  currency                text        not null,
  subtotal                numeric     not null,
  tax_rate                numeric,
  tax_amount              numeric,
  total                   numeric     not null,
  status                  text        not null default 'draft' check (status in ('draft','sent','paid','overdue')),
  issue_date              date        not null,
  due_date                date        not null,
  linked_income_entry_id  text,
  notes                   text,
  created_at              timestamptz not null default now()
);

-- ─── Expenses ─────────────────────────────────────────────────────────────────
create table if not exists expenses (
  id                text        primary key default 'exp_' || replace(gen_random_uuid()::text, '-', ''),
  user_id           uuid        references profiles(id) on delete cascade not null,
  date              date        not null,
  amount            numeric     not null,
  currency          text        not null,
  category          text        not null check (category in ('software','hardware','travel','coworking','marketing','education','fees','other')),
  description       text        not null,
  vendor            text,
  is_tax_deductible boolean     not null default false,
  is_recurring      boolean     not null default false,
  recurring_id      text,
  created_at        timestamptz not null default now()
);

-- ─── Projects ─────────────────────────────────────────────────────────────────
create table if not exists projects (
  id             text        primary key default 'proj_' || replace(gen_random_uuid()::text, '-', ''),
  user_id        uuid        references profiles(id) on delete cascade not null,
  client_id      text        references clients(id) on delete set null,
  client_name    text        not null,
  name           text        not null,
  status         text        not null default 'active' check (status in ('active','on-hold','completed','cancelled')),
  budget_amount  numeric,
  currency       text        not null default 'EUR',
  start_date     date        not null,
  end_date       date,
  contract_id    text,
  proposal_id    text,
  notes          text,
  created_at     timestamptz not null default now()
);

-- ─── Proposals ────────────────────────────────────────────────────────────────
create table if not exists proposals (
  id                        text        primary key default 'prop_' || replace(gen_random_uuid()::text, '-', ''),
  user_id                   uuid        references profiles(id) on delete cascade not null,
  client_id                 text        references clients(id) on delete set null,
  client_name               text        not null,
  project_name              text        not null,
  status                    text        not null default 'draft' check (status in ('draft','sent','accepted','declined','expired')),
  items                     jsonb       not null default '[]',
  currency                  text        not null,
  subtotal                  numeric     not null,
  total                     numeric     not null,
  valid_until               date        not null,
  scope                     text,
  deliverables              text,
  notes                     text,
  sent_at                   timestamptz,
  responded_at              timestamptz,
  converted_to_invoice_id   text,
  converted_to_contract_id  text,
  converted_to_project_id   text,
  created_at                timestamptz not null default now()
);

-- ─── Contracts ────────────────────────────────────────────────────────────────
create table if not exists contracts (
  id                        text        primary key default 'con_' || replace(gen_random_uuid()::text, '-', ''),
  user_id                   uuid        references profiles(id) on delete cascade not null,
  client_id                 text        references clients(id) on delete set null,
  client_name               text        not null,
  project_name              text        not null,
  status                    text        not null default 'draft' check (status in ('draft','sent','signed','active','completed','cancelled')),
  proposal_id               text,
  rate                      numeric     not null,
  rate_type                 text        not null check (rate_type in ('hourly','fixed','monthly')),
  currency                  text        not null,
  payment_terms_days        integer     not null default 14,
  start_date                date        not null,
  end_date                  date,
  scope                     text        not null,
  deliverables              text        not null,
  revision_policy           text,
  termination_clause        text,
  notes                     text,
  signed_at                 timestamptz,
  freelancer_signature_name text,
  client_signature_name     text,
  client_signed_at          timestamptz,
  created_at                timestamptz not null default now()
);

-- ─── Time entries ─────────────────────────────────────────────────────────────
create table if not exists time_entries (
  id                text        primary key default 'te_' || replace(gen_random_uuid()::text, '-', ''),
  user_id           uuid        references profiles(id) on delete cascade not null,
  date              date        not null,
  client_name       text        not null,
  project_name      text,
  description       text        not null,
  duration_minutes  integer     not null,
  hourly_rate       numeric     not null,
  currency          text        not null,
  is_billed         boolean     not null default false,
  invoice_id        text,
  created_at        timestamptz not null default now()
);

-- ─── Leads ────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id                     text        primary key default 'lead_' || replace(gen_random_uuid()::text, '-', ''),
  user_id                uuid        references profiles(id) on delete cascade not null,
  name                   text        not null,
  company                text        not null,
  email                  text,
  source                 text        not null check (source in ('referral','linkedin','upwork','fiverr','website','cold','other')),
  stage                  text        not null default 'prospect' check (stage in ('prospect','qualified','proposal','won','lost')),
  estimated_value        numeric,
  currency               text        not null default 'EUR',
  notes                  text,
  converted_to_client_id text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ─── Reminder logs ────────────────────────────────────────────────────────────
create table if not exists reminder_logs (
  id          text        primary key default 'rem_' || replace(gen_random_uuid()::text, '-', ''),
  user_id     uuid        references profiles(id) on delete cascade not null,
  invoice_id  text        not null,
  sent_at     timestamptz not null default now(),
  channel     text        not null check (channel in ('copied','email','manual')),
  note        text
);

-- ─── Tax reminders ────────────────────────────────────────────────────────────
create table if not exists tax_reminders (
  id                text        primary key default 'tax_' || replace(gen_random_uuid()::text, '-', ''),
  user_id           uuid        references profiles(id) on delete cascade not null,
  quarter           integer     not null check (quarter between 1 and 4),
  year              integer     not null,
  due_date          date        not null,
  estimated_amount  numeric     not null,
  currency          text        not null,
  is_paid           boolean     not null default false,
  country           text        not null
);

-- ─── Webhooks ─────────────────────────────────────────────────────────────────
create table if not exists webhooks (
  id          text        primary key default 'wh_' || replace(gen_random_uuid()::text, '-', ''),
  user_id     uuid        references profiles(id) on delete cascade not null,
  url         text        not null,
  events      text[]      not null default '{}',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- ─── Client portals ───────────────────────────────────────────────────────────
create table if not exists client_portals (
  client_id        text        references clients(id) on delete cascade primary key,
  user_id          uuid        references profiles(id) on delete cascade not null,
  token            text        not null unique,
  is_enabled       boolean     not null default false,
  freelancer_name  text        not null,
  header_note      text,
  allow_feedback   boolean     not null default true,
  show_invoices    boolean     not null default true,
  show_files       boolean     not null default true,
  show_updates     boolean     not null default true
);

-- ─── Portal updates ───────────────────────────────────────────────────────────
create table if not exists portal_updates (
  id          text        primary key default 'upd_' || replace(gen_random_uuid()::text, '-', ''),
  client_id   text        references clients(id) on delete cascade not null,
  user_id     uuid        references profiles(id) on delete cascade not null,
  title       text        not null,
  content     text        not null,
  status      text        not null check (status in ('on-track','review','completed','blocked')),
  created_at  timestamptz not null default now()
);

-- ─── Shared files ─────────────────────────────────────────────────────────────
create table if not exists shared_files (
  id           text        primary key default 'file_' || replace(gen_random_uuid()::text, '-', ''),
  client_id    text        references clients(id) on delete cascade not null,
  user_id      uuid        references profiles(id) on delete cascade not null,
  name         text        not null,
  type         text        not null check (type in ('design','document','video','other')),
  size_label   text        not null,
  description  text,
  uploaded_at  timestamptz not null default now()
);

-- ─── Client feedback ──────────────────────────────────────────────────────────
create table if not exists client_feedback (
  id           text        primary key default 'fb_' || replace(gen_random_uuid()::text, '-', ''),
  client_id    text        references clients(id) on delete cascade not null,
  file_id      text        references shared_files(id) on delete set null,
  author_name  text        not null,
  content      text        not null,
  submitted_at timestamptz not null default now(),
  is_read      boolean     not null default false
);

-- ============================================================
--  INDEXES
-- ============================================================

create index if not exists idx_income_entries_user_id    on income_entries(user_id);
create index if not exists idx_income_entries_date       on income_entries(date);
create index if not exists idx_clients_user_id           on clients(user_id);
create index if not exists idx_invoices_user_id          on invoices(user_id);
create index if not exists idx_invoices_status           on invoices(status);
create index if not exists idx_expenses_user_id          on expenses(user_id);
create index if not exists idx_expenses_date             on expenses(date);
create index if not exists idx_projects_user_id          on projects(user_id);
create index if not exists idx_proposals_user_id         on proposals(user_id);
create index if not exists idx_contracts_user_id         on contracts(user_id);
create index if not exists idx_time_entries_user_id      on time_entries(user_id);
create index if not exists idx_leads_user_id             on leads(user_id);
create index if not exists idx_portal_updates_client_id  on portal_updates(client_id);
create index if not exists idx_shared_files_client_id    on shared_files(client_id);
create index if not exists idx_client_portals_token      on client_portals(token);
create index if not exists idx_profiles_slug             on profiles(public_page_slug) where public_page_slug is not null;

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================

alter table profiles       enable row level security;
alter table income_entries enable row level security;
alter table connections    enable row level security;
alter table clients        enable row level security;
alter table invoices       enable row level security;
alter table expenses       enable row level security;
alter table projects       enable row level security;
alter table proposals      enable row level security;
alter table contracts      enable row level security;
alter table time_entries   enable row level security;
alter table leads          enable row level security;
alter table reminder_logs  enable row level security;
alter table tax_reminders  enable row level security;
alter table webhooks       enable row level security;
alter table client_portals enable row level security;
alter table portal_updates enable row level security;
alter table shared_files   enable row level security;
alter table client_feedback enable row level security;

-- Drop all policies before (re-)creating so this script is safely re-runnable
drop policy if exists "own_profile"            on profiles;
drop policy if exists "public_page_read"       on profiles;
drop policy if exists "own_income"             on income_entries;
drop policy if exists "own_connections"        on connections;
drop policy if exists "own_clients"            on clients;
drop policy if exists "own_invoices"           on invoices;
drop policy if exists "own_expenses"           on expenses;
drop policy if exists "own_projects"           on projects;
drop policy if exists "own_proposals"          on proposals;
drop policy if exists "own_contracts"          on contracts;
drop policy if exists "own_time"               on time_entries;
drop policy if exists "own_leads"              on leads;
drop policy if exists "own_reminders"          on reminder_logs;
drop policy if exists "own_tax"                on tax_reminders;
drop policy if exists "own_webhooks"           on webhooks;
drop policy if exists "own_portals"            on client_portals;
drop policy if exists "portal_public_read"     on client_portals;
drop policy if exists "own_updates"            on portal_updates;
drop policy if exists "own_files"              on shared_files;
drop policy if exists "feedback_public_insert" on client_feedback;
drop policy if exists "feedback_owner_read"    on client_feedback;
drop policy if exists "feedback_owner_update"  on client_feedback;

-- Profiles
create policy "own_profile" on profiles
  for all using (auth.uid() = id);

-- Standard "user owns their rows" policies
create policy "own_income"       on income_entries for all using (auth.uid() = user_id);
create policy "own_connections"  on connections    for all using (auth.uid() = user_id);
create policy "own_clients"      on clients        for all using (auth.uid() = user_id);
create policy "own_invoices"     on invoices       for all using (auth.uid() = user_id);
create policy "own_expenses"     on expenses       for all using (auth.uid() = user_id);
create policy "own_projects"     on projects       for all using (auth.uid() = user_id);
create policy "own_proposals"    on proposals      for all using (auth.uid() = user_id);
create policy "own_contracts"    on contracts      for all using (auth.uid() = user_id);
create policy "own_time"         on time_entries   for all using (auth.uid() = user_id);
create policy "own_leads"        on leads          for all using (auth.uid() = user_id);
create policy "own_reminders"    on reminder_logs  for all using (auth.uid() = user_id);
create policy "own_tax"          on tax_reminders  for all using (auth.uid() = user_id);
create policy "own_webhooks"     on webhooks       for all using (auth.uid() = user_id);
create policy "own_portals"      on client_portals for all using (auth.uid() = user_id);
create policy "own_updates"      on portal_updates for all using (auth.uid() = user_id);
create policy "own_files"        on shared_files   for all using (auth.uid() = user_id);

-- Public page: anyone can read an enabled public profile by slug
create policy "public_page_read" on profiles
  for select using (public_page_enabled = true);

-- Client portal: public read by token (no login needed for clients)
create policy "portal_public_read" on client_portals
  for select using (is_enabled = true);

-- Client feedback: anyone can submit; only the freelancer can read/update
create policy "feedback_public_insert" on client_feedback
  for insert with check (true);

create policy "feedback_owner_read" on client_feedback
  for select using (
    exists (
      select 1 from clients c
      where c.id = client_feedback.client_id
        and c.user_id = auth.uid()
    )
  );

create policy "feedback_owner_update" on client_feedback
  for update using (
    exists (
      select 1 from clients c
      where c.id = client_feedback.client_id
        and c.user_id = auth.uid()
    )
  );

-- ============================================================
--  AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
--  AUTO-UPDATE updated_at on leads + profiles
-- ============================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at
  before update on leads
  for each row execute function set_updated_at();

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ─── Profile extra columns (run once if upgrading an existing DB) ─────────────
alter table profiles add column if not exists phone    text;
alter table profiles add column if not exists website  text;
alter table profiles add column if not exists bio      text;
alter table profiles add column if not exists language text not null default 'en';
