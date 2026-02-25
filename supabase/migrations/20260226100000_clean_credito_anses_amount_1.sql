-- Eliminar duplicados de Credito ANSES con amount = 1 (generados por regex que capturaba "1" en texto tipo "cuota 1").
-- Endurecer amount_regex para no volver a matchear un "1" suelto.

delete from bills
where service = 'Credito ANSES'
  and amount = 1
  and source = 'gmail';

-- Quitar la alternativa "[$]?\s*(\d+(?:\.\d{2})?)" que matcheaba cualquier número suelto (ej. "1" en "cuota 1").
-- Dejar solo "Monto de $X" y "Monto...X".
update email_services
set amount_regex = 'Monto de [$]?\s*(\d+(?:\.\d{2})?)||Monto[^\d]*(\d[\d.,]+)'
where name = 'Credito ANSES';
