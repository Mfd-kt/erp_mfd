-- Sprint 6: exchange rates for group forecast (multi-currency consolidation)
-- Rate: 1 unit of from_currency = rate units of to_currency (e.g. EUR->USD 1.08)

CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate numeric NOT NULL CHECK (rate > 0),
  effective_from date DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_from_to
  ON exchange_rates (from_currency, to_currency);

COMMENT ON TABLE exchange_rates IS 'Rates for converting to group base_currency. Insert e.g. (USD, EUR, 0.92) for 1 USD = 0.92 EUR.';
