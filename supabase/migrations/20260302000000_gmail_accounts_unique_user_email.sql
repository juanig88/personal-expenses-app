-- Dejar una sola fila por user_email (la más reciente por created_at) y agregar UNIQUE.
-- Así el upsert en NextAuth puede usar onConflict('user_email') y actualizar en lugar de insertar.

-- Eliminar duplicados: conservar solo la fila con created_at más reciente por user_email
WITH kept AS (
  SELECT DISTINCT ON (user_email) ctid
  FROM gmail_accounts
  ORDER BY user_email, created_at DESC NULLS LAST
)
DELETE FROM gmail_accounts
WHERE ctid NOT IN (SELECT ctid FROM kept);

-- Agregar constraint único para que upsert(..., { onConflict: 'user_email' }) actualice la fila
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gmail_accounts_user_email_key'
  ) THEN
    ALTER TABLE gmail_accounts ADD CONSTRAINT gmail_accounts_user_email_key UNIQUE (user_email);
  END IF;
END $$;
