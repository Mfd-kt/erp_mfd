-- Align recurring_rules with app schema when table was created before interval_count / related columns existed.
-- (CREATE TABLE IF NOT EXISTS does not add new columns to an existing table.)

ALTER TABLE recurring_rules
  ADD COLUMN IF NOT EXISTS interval_count integer NOT NULL DEFAULT 1;

ALTER TABLE recurring_rules
  ADD COLUMN IF NOT EXISTS month_of_year integer;

ALTER TABLE recurring_rules
  ADD COLUMN IF NOT EXISTS last_generated_at timestamptz;

ALTER TABLE recurring_rules
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN recurring_rules.interval_count IS 'Repeat every N periods (e.g. every 2 months when frequency is monthly).';
