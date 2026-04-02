-- View: debts_with_remaining
-- Exposes each debt with computed total_paid, remaining_company_currency, and computed_status.
-- Do NOT add a stored remaining_amount column to the debts table; this view is the source of truth.
--
-- computed_status logic:
--   remaining_company_currency <= 0  => 'paid'
--   total_paid > 0                    => 'partially_paid'
--   due_date < current_date           => 'overdue'
--   else                              => 'open'

CREATE OR REPLACE VIEW debts_with_remaining AS
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

COMMENT ON VIEW debts_with_remaining IS 'Debts with computed paid/remaining amounts and status. Use this for read-only display; never store remaining_amount in debts table.';
