-- Add company type: business | personal
-- Enables personal finance management as a company-like entity.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'business'
  CHECK (type IN ('business', 'personal'));

COMMENT ON COLUMN companies.type IS 'business: société professionnelle; personal: finances personnelles';

CREATE INDEX IF NOT EXISTS idx_companies_type ON companies (type);
