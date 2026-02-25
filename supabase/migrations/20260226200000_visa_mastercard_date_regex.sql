-- Visa y Mastercard Galicia: aceptar vencimiento en "02 Mar 26" o "02/03/2026" (DD/MM/YYYY).
-- Así no se descartan mails solo por formato de fecha.

update email_services
set date_regex = 'Vencimiento[:\s]*(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})||Vencimiento[:\s]*(\d{1,2}/\d{1,2}/\d{2,4})'
where name = 'Visa Galicia';

update email_services
set date_regex = 'Vencimiento[:\s]*(\d{1,2}/\d{1,2}/\d{4})||Vencimiento[:\s]*(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})'
where name = 'Mastercard Galicia';
