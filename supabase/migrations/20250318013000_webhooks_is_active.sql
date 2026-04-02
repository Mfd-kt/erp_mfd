ALTER TABLE webhooks
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_webhooks_company_event_active
  ON webhooks (company_id, event_type, is_active);
