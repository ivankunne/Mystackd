-- Run in Supabase SQL Editor > New query
-- Adds recurring invoice columns to the invoices table.
-- Safe to run multiple times (IF NOT EXISTS guards).

alter table invoices
  add column if not exists is_recurring        boolean      not null default false,
  add column if not exists recurring_frequency text,          -- 'monthly' | 'quarterly' | 'annually'
  add column if not exists recurring_next_date date,          -- next date to generate an invoice
  add column if not exists recurring_parent_id text references invoices(id) on delete set null;

create index if not exists idx_invoices_recurring on invoices(is_recurring, recurring_next_date)
  where is_recurring = true;
