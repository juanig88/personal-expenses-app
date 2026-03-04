-- Push subscriptions for Web Push (recordatorios de vencimientos al celular).
-- One row per device/browser per user.

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  endpoint text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  unique (endpoint)
);

create index if not exists push_subscriptions_user_email_idx on push_subscriptions (user_email);

comment on table push_subscriptions is 'Web Push subscriptions per user for due-date reminders';
