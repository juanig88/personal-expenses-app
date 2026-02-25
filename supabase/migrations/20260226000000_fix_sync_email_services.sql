-- Ajustes para que el sync registre Credito ANSES, Visa y Mastercard.
-- El sync ahora usa asunto + cuerpo para filtrar y para los regex.

-- Credito ANSES: primero "Monto de $66757.73" (escapar $ en regex), luego alternativas
update email_services
set
  amount_regex = 'Monto de [$]?\s*(\d+(?:\.\d{2})?)||[$]?\s*(\d+(?:\.\d{2})?)||Monto[^\d]*(\d[\d.,]+)',
  body_include_any = 'Créditos ANSES,Cuota,Monto,cuota,monto'
where name = 'Credito ANSES';

-- Visa Galicia: body con asunto "Resumen de Cuenta"; aceptar también "resumen" y "cuenta"
update email_services
set
  body_include_any = 'Saldo en pesos,VISA,Resumen de Cuenta,resumen de tu cuenta',
  amount_regex = 'Saldo en pesos[:\s]*([\d.,\s]+)',
  amount_dollar_regex = 'Saldo en dólares[:\s]*([\d.,\s]+)'
where name = 'Visa Galicia';

-- Mastercard Galicia: asunto "Resumen de Tarjeta MasterCard"; regex más flexible
update email_services
set
  body_include_any = 'Total en pesos,MasterCard,Mastercard,Resumen de Tarjeta,resumen de tu tarjeta',
  amount_regex = 'Total en pesos[:\s]*([\d.,\s]+)',
  amount_dollar_regex = 'Total en dólares[:\s]*([\d.,\s]+)'
where name = 'Mastercard Galicia';
