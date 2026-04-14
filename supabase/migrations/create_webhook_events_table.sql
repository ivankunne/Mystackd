-- Create stripe_webhook_events table for idempotency
create table if not exists stripe_webhook_events (
  id uuid default gen_random_uuid() primary key,
  stripe_event_id text unique not null,
  event_type text not null,
  processed_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

-- Create index for faster lookups
create index if not exists idx_stripe_event_id on stripe_webhook_events(stripe_event_id);
create index if not exists idx_event_type on stripe_webhook_events(event_type);
