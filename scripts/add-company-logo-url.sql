-- Ejecutar en Supabase SQL Editor
-- Agrega columna para logotipo de empresa (usado en reportes PDF)

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN companies.logo_url IS 'URL publica del logotipo de la empresa (Storage)';
