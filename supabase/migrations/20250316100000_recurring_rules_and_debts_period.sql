-- Sprint 5: Recurring rules + idempotent generation (generated_period_key on debts)
-- Idempotency: UNIQUE(source_recurring_rule_id, generated_period_key) prevents duplicate debts per rule per period.

-- 1. debts: add generated_period_key for recurring-generated debts
ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS generated_period_key text;

COMMENT ON COLUMN debts.generated_period_key IS 'Logical period for recurring-generated debt, e.g. 2026-03, 2026-Q2, 2026. Used with source_recurring_rule_id for idempotency.';

-- 2. Idempotency: one debt per rule per period (enforced at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_debts_recurring_period_unique
  ON debts (source_recurring_rule_id, generated_period_key)
  WHERE source_recurring_rule_id IS NOT NULL AND generated_period_key IS NOT NULL;

-- 3. recurring_rules table
CREATE TABLE IF NOT EXISTS recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  creditor_id uuid REFERENCES creditors(id) ON DELETE SET NULL,
  debt_category_id uuid NOT NULL REFERENCES debt_categories(id) ON DELETE RESTRICT,
  title text NOT NULL,
  template_description text,
  amount numeric NOT NULL CHECK (amount > 0),
  currency_code text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  interval_count integer NOT NULL DEFAULT 1,
  day_of_month integer CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)),
  month_of_year integer CHECK (month_of_year IS NULL OR (month_of_year >= 1 AND month_of_year <= 12)),
  start_date date NOT NULL,
  end_date date,
  next_run_date date NOT NULL,
  auto_generate boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_end_date CHECK (end_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE recurring_rules IS 'Templates for generating recurring debt instances. Generation is idempotent per rule per logical period.';

CREATE INDEX IF NOT EXISTS idx_recurring_rules_company_active_next
  ON recurring_rules (company_id, is_active, next_run_date);

CREATE INDEX IF NOT EXISTS idx_debts_source_recurring_rule
  ON debts (source_recurring_rule_id)
  WHERE source_recurring_rule_id IS NOT NULL;

-- 4. Recreate view to add generated_period_key (REPLACE would rename columns by position)
DROP VIEW IF EXISTS debts_with_remaining;

CREATE VIEW debts_with_remaining AS
SELECT
  d.id,
  d.company_id,
  d.creditor_id,
  d.debt_category_id,
  d.title,
  d.description,
  d.amount_original,
  d.currency_code,
  d.fx_rate_to_company_currency,
  d.amount_company_currency,
  d.due_date,
  d.incurred_date,
  d.status,
  d.priority,
  d.is_recurring_instance,
  d.source_recurring_rule_id,
  d.generated_period_key,
  d.notes,
  d.created_at,
  COALESCE(SUM(p.amount_company_currency), 0)::numeric AS paid_company_currency,
  (d.amount_company_currency - COALESCE(SUM(p.amount_company_currency), 0))::numeric AS remaining_company_currency,
  CASE
    WHEN (d.amount_company_currency - COALESCE(SUM(p.amount_company_currency), 0)) <= 0 THEN 'paid'::debt_status
    WHEN COALESCE(SUM(p.amount_company_currency), 0) > 0 THEN 'partially_paid'::debt_status
    WHEN d.due_date IS NOT NULL AND d.due_date < CURRENT_DATE THEN 'overdue'::debt_status
    ELSE 'open'::debt_status
  END AS computed_status
FROM debts d
LEFT JOIN payments p ON p.debt_id = d.id
GROUP BY d.id;

COMMENT ON VIEW debts_with_remaining IS 'Debts with computed paid/remaining and status. Includes generated_period_key for recurring debts.';
