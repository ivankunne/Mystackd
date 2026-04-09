-- Run this in Supabase SQL Editor > New query
-- Safe to run multiple times (all statements use IF NOT EXISTS / IF EXISTS guards)

-- ─── Unique constraint required for tax_reminders upsert ─────────────────────
alter table tax_reminders
  drop constraint if exists tax_reminders_user_quarter_year_key;
alter table tax_reminders
  add constraint tax_reminders_user_quarter_year_key unique (user_id, quarter, year);

-- ─── Original profile JSONB columns ──────────────────────────────────────────
alter table profiles
  add column if not exists notification_prefs jsonb not null default '{"weeklyDigest":true,"monthlyReport":true,"taxReminders":true,"invoiceOverdue":true,"newPayment":false,"productUpdates":true,"dashboardBanners":true}',
  add column if not exists payment_info        jsonb not null default '{"accountName":"","bankName":"","iban":"","bic":"","paypalEmail":"","wiseEmail":"","paymentNotes":"Please include the invoice number as the payment reference."}',
  add column if not exists appearance_prefs    jsonb not null default '{"dateFormat":"DD/MM/YYYY","numberFormat":"1,000.00","weekStart":"monday","fiscalYearStart":"january"}';

-- ─── New profile text columns (phone, website, bio, language) ─────────────────
alter table profiles
  add column if not exists phone    text,
  add column if not exists website  text,
  add column if not exists bio      text,
  add column if not exists language text not null default 'en';

-- ─── Backfill dashboardBanners for existing notification_prefs rows ───────────
-- Sets dashboardBanners = true for any row that doesn't already have it.
update profiles
set notification_prefs = notification_prefs || '{"dashboardBanners": true}'::jsonb
where notification_prefs -> 'dashboardBanners' is null;
