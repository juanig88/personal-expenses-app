-- Aceptar "dólares" con tilde o "dolares" sin tilde (por si el HTML no decodifica entidades).
-- El sync ya decodifica entidades; esta alternativa es respaldo.

update email_services
set amount_dollar_regex = 'Saldo en dólares[:\s]*([\d.,\s]+)||Saldo en dolares[:\s]*([\d.,\s]+)'
where name = 'Visa Galicia';

update email_services
set amount_dollar_regex = 'Total en dólares[:\s]*([\d.,\s]+)||Total en dolares[:\s]*([\d.,\s]+)'
where name = 'Mastercard Galicia';
