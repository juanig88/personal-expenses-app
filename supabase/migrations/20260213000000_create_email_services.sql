-- Tabla de servicios de email: configuración por proveedor (Ecogas, Edenor, etc.)
-- El job de sync lee esta tabla y para cada servicio busca mails y guarda en bills.

create table if not exists email_services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  from_email text not null,
  user_name_filter text,
  amount_regex text,
  date_regex text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on column email_services.name is 'Nombre del servicio (ej: Ecogas, Edenor)';
comment on column email_services.from_email is 'Email del remitente para filtrar en Gmail (ej: factura_digital@ecogas.com.ar)';
comment on column email_services.user_name_filter is 'Texto que debe aparecer en el cuerpo del mail para considerar la factura (ej: nombre del titular)';
comment on column email_services.amount_regex is 'Regex para monto (opcional). Varios patrones separados por || se prueban en orden.';
comment on column email_services.date_regex is 'Regex para fecha (opcional). Varios patrones separados por || se prueban en orden. Ej: (\\d{2}/\\d{2}/\\d{2})||(\\d{2}-\\d{2}-\\d{4})';

create unique index if not exists email_services_from_email_key on email_services (from_email);

-- Ecogas: vencimiento DD/MM/YYYY, monto $ X.XXX,XX
insert into email_services (name, from_email, user_name_filter) values
  ('Ecogas', 'factura_digital@ecogas.com.ar', 'JUAN IGNACIO GARCIA')
on conflict (from_email) do update set
  name = excluded.name,
  user_name_filter = excluded.user_name_filter;

-- EPEC (luz Córdoba): vencimiento DD/MM/YY. Sin \b para evitar problemas de backslash en JS.
insert into email_services (name, from_email, user_name_filter, date_regex) values
  ('EPEC', 'avisos@oficinaepec.com.ar', 'GARCIA JUAN IGNACIO', '(\\d{2}/\\d{2}/\\d{2})')
on conflict (from_email) do update set
  name = excluded.name,
  user_name_filter = excluded.user_name_filter,
  date_regex = excluded.date_regex;
