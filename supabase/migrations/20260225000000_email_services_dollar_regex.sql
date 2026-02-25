-- Soporte para tarjetas (Visa/Mastercard): sumar pesos + dólares convertidos a ARS.
-- Varios servicios pueden compartir el mismo from_email (ej. Visa y Mastercard Galicia).

drop index if exists email_services_from_email_key;

-- Permitir upsert por (from_email, name)
create unique index if not exists email_services_from_email_name_key
  on email_services (from_email, name);

alter table email_services
  add column if not exists amount_dollar_regex text;

comment on column email_services.amount_dollar_regex is 'Opcional. Si está definido, se extrae el monto en USD, se convierte con dólar oficial y se suma al monto en pesos (amount_regex). El total se guarda en ARS.';

-- Visa Galicia: Saldo en pesos + Saldo en dólares (convertido), vencimiento "02 Mar 26"
insert into email_services (
  name,
  from_email,
  user_name_filter,
  amount_regex,
  amount_dollar_regex,
  date_regex,
  body_include_any,
  active
) values (
  'Visa Galicia',
  'e-resumen@bancogalicia.com.ar',
  'GARCIA',
  'Saldo en pesos[:\s]*([\d.,\s]+)',
  'Saldo en dólares[:\s]*([\d.,\s]+)',
  'Vencimiento[:\s]*(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})',
  'VISA,Resumen de Cuenta,Saldo en pesos',
  true
) on conflict (from_email, name) do update set
  user_name_filter = excluded.user_name_filter,
  amount_regex = excluded.amount_regex,
  amount_dollar_regex = excluded.amount_dollar_regex,
  date_regex = excluded.date_regex,
  body_include_any = excluded.body_include_any,
  active = excluded.active;

-- Mastercard Galicia: Total en pesos + Total en dólares (convertido), vencimiento "01/12/2025"
insert into email_services (
  name,
  from_email,
  user_name_filter,
  amount_regex,
  amount_dollar_regex,
  date_regex,
  body_include_any,
  active
) values (
  'Mastercard Galicia',
  'e-resumen@bancogalicia.com.ar',
  'GARCIA',
  'Total en pesos[:\s]*([\d.,\s]+)',
  'Total en dólares[:\s]*([\d.,\s]+)',
  'Vencimiento[:\s]*(\d{1,2}/\d{1,2}/\d{4})',
  'MasterCard,Resumen de Tarjeta,Total en pesos',
  true
) on conflict (from_email, name) do update set
  user_name_filter = excluded.user_name_filter,
  amount_regex = excluded.amount_regex,
  amount_dollar_regex = excluded.amount_dollar_regex,
  date_regex = excluded.date_regex,
  body_include_any = excluded.body_include_any,
  active = excluded.active;
