-- Coordonnées siège / société (créanciers type company)
ALTER TABLE public.creditors
  ADD COLUMN IF NOT EXISTS company_registration text,
  ADD COLUMN IF NOT EXISTS address_street text,
  ADD COLUMN IF NOT EXISTS address_postal_code text,
  ADD COLUMN IF NOT EXISTS address_city text,
  ADD COLUMN IF NOT EXISTS address_country text;

COMMENT ON COLUMN public.creditors.company_registration IS 'Ligne immatriculation (ex. R.C.S PARIS 845151067).';
COMMENT ON COLUMN public.creditors.address_street IS 'Voie et numéro.';
COMMENT ON COLUMN public.creditors.address_postal_code IS 'Code postal.';
COMMENT ON COLUMN public.creditors.address_city IS 'Ville.';
COMMENT ON COLUMN public.creditors.address_country IS 'Pays libellé (facultatif ; sinon dérivé du code pays).';
