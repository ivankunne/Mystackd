-- Run in Supabase SQL Editor > New query
-- Safe to run multiple times (IF NOT EXISTS guards everywhere)

-- ─── 1. income_entries: add client_id FK ──────────────────────────────────────
alter table income_entries
  add column if not exists client_id text references clients(id) on delete set null;

create index if not exists idx_income_entries_client_id on income_entries(client_id);

-- ─── 2. invoices: add client_id FK + paid_at timestamp ───────────────────────
alter table invoices
  add column if not exists client_id text references clients(id) on delete set null,
  add column if not exists paid_at   timestamptz;

create index if not exists idx_invoices_client_id on invoices(client_id);

-- ─── 3. shared_files: add storage columns ────────────────────────────────────
alter table shared_files
  add column if not exists storage_path text,
  add column if not exists storage_url  text;

-- ─── 4. Supabase Storage: portal-files bucket ────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('portal-files', 'portal-files', false)
  on conflict (id) do nothing;

-- Drop policies first so the script is safe to re-run
drop policy if exists "portal_files_insert" on storage.objects;
drop policy if exists "portal_files_select" on storage.objects;
drop policy if exists "portal_files_delete" on storage.objects;

-- Allow authenticated users to upload files
create policy "portal_files_insert"
  on storage.objects for insert
  with check (bucket_id = 'portal-files' and auth.role() = 'authenticated');

-- Allow authenticated users to read files
create policy "portal_files_select"
  on storage.objects for select
  using (bucket_id = 'portal-files' and auth.role() = 'authenticated');

-- Allow authenticated users to delete files
create policy "portal_files_delete"
  on storage.objects for delete
  using (bucket_id = 'portal-files' and auth.role() = 'authenticated');
