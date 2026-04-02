-- Sprint 10: Data integrity constraints
-- Add CHECK constraints where missing. Some tables may not exist in this repo; use IF EXISTS where needed.

-- Payments: amount must be positive (if column exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'amount') THEN
    ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payments_amount_positive;
    ALTER TABLE payments ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0);
  END IF;
END $$;

-- Revenues: amount_received <= amount_expected
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'revenues' AND column_name = 'amount_received') THEN
    ALTER TABLE revenues DROP CONSTRAINT IF EXISTS chk_revenues_amount_received;
    ALTER TABLE revenues ADD CONSTRAINT chk_revenues_amount_received
      CHECK (amount_received IS NULL OR amount_expected IS NULL OR amount_received <= amount_expected);
  END IF;
END $$;

-- Debts: amount_company_currency > 0
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'debts' AND column_name = 'amount_company_currency') THEN
    ALTER TABLE debts DROP CONSTRAINT IF EXISTS chk_debts_amount_positive;
    ALTER TABLE debts ADD CONSTRAINT chk_debts_amount_positive CHECK (amount_company_currency > 0);
  END IF;
END $$;

-- Indexes for performance (if not exist)
CREATE INDEX IF NOT EXISTS idx_payments_company_created ON payments (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_debt ON payments (debt_id);
CREATE INDEX IF NOT EXISTS idx_revenues_company_created ON revenues (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debts_company_due ON debts (company_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debts_company_created ON debts (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts (company_id);
