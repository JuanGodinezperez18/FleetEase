-- Logotipo de empresa para reportes PDF y branding
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN public.companies.logo_url IS 'URL pública del logotipo de la empresa (reportes y documentos)';
