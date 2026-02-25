-- Los resúmenes Galicia (Visa y Mastercard) también pueden llegar desde mensajesgalicia.com.ar.
-- Misma configuración que el remitente bancogalicia; el sync procesa cada from_email por separado.

insert into email_services (
  name,
  from_email,
  user_name_filter,
  amount_regex,
  amount_dollar_regex,
  date_regex,
  body_include_any,
  active
) values
  (
    'Visa Galicia',
    'e-resumen@mensajesgalicia.com.ar',
    'GARCIA',
    'Saldo en pesos[:\s]*([\d.,\s]+)',
    'Saldo en dólares[:\s]*([\d.,\s]+)',
    'Vencimiento[:\s]*(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})||Vencimiento[:\s]*(\d{1,2}/\d{1,2}/\d{2,4})',
    'Saldo en pesos,VISA,Resumen de Cuenta,resumen de tu cuenta',
    true
  ),
  (
    'Mastercard Galicia',
    'e-resumen@mensajesgalicia.com.ar',
    'GARCIA',
    'Total en pesos[:\s]*([\d.,\s]+)',
    'Total en dólares[:\s]*([\d.,\s]+)',
    'Vencimiento[:\s]*(\d{1,2}/\d{1,2}/\d{4})||Vencimiento[:\s]*(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})',
    'Total en pesos,MasterCard,Mastercard,Resumen de Tarjeta,resumen de tu tarjeta',
    true
  )
on conflict (from_email, name) do update set
  user_name_filter = excluded.user_name_filter,
  amount_regex = excluded.amount_regex,
  amount_dollar_regex = excluded.amount_dollar_regex,
  date_regex = excluded.date_regex,
  body_include_any = excluded.body_include_any,
  active = excluded.active;
