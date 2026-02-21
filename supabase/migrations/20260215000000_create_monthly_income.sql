-- Ingreso mensual por usuario. Si no está cargado, no se asume valor por defecto.
create table if not exists monthly_income (
  user_email text not null,
  year smallint not null,
  month smallint not null,
  amount numeric not null,
  currency text not null default 'ARS',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_email, year, month),
  constraint monthly_income_month_check check (month >= 1 and month <= 12)
);

-- RLS: app always filters by user_email (session from NextAuth).
-- If you use Supabase Auth and set email in JWT, you can tighten to: using (auth.jwt() ->> 'email' = user_email)
alter table monthly_income enable row level security;

create policy "App manages monthly_income by user_email"
  on monthly_income for all
  using (true)
  with check (true);

-- Optional: trigger to refresh updated_at (if you use it later)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger monthly_income_updated_at
  before update on monthly_income
  for each row execute function set_updated_at();
