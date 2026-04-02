-- Align DB column with application code (forecast/queries use rate_date).
-- Older installs used effective_from from 20250317000000_forecast_exchange_rates.sql

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'exchange_rates'
      AND column_name = 'effective_from'
  ) THEN
    ALTER TABLE exchange_rates RENAME COLUMN effective_from TO rate_date;
  END IF;
END $$;

COMMENT ON COLUMN exchange_rates.rate_date IS 'Date from which this rate applies (inclusive). Latest row with rate_date <= query date wins.';
