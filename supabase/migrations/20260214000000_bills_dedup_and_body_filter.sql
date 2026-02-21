-- Evitar duplicados: misma factura (user + service + due_date) = una sola fila.
-- Borrar duplicados dejando uno por grupo (el más reciente por created_at).
delete from bills
where id not in (
  select distinct on (user_email, service, due_date) id
  from bills
  order by user_email, service, due_date, created_at desc
);

create unique index if not exists bills_user_service_due_date_key
  on bills (user_email, service, due_date);

-- Filtro opcional por palabras en el cuerpo (ej: solo mails que digan "detalle" o "facturas").
alter table email_services
  add column if not exists body_include_any text;

comment on column email_services.body_include_any is 'Opcional. El cuerpo debe contener al menos una de estas palabras (separadas por coma, case insensitive). Ej: detalle,facturas';

update email_services
set body_include_any = 'detalle,facturas'
where from_email = 'avisos@oficinaepec.com.ar';
