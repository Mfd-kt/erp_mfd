CREATE TABLE IF NOT EXISTS revenue_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_revenue_clients_company_name
  ON revenue_clients (company_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_revenue_clients_company_created
  ON revenue_clients (company_id, created_at DESC);

ALTER TABLE revenues
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES revenue_clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revenue_category text;

UPDATE revenues
SET revenue_category = COALESCE(revenue_category, 'other')
WHERE revenue_category IS NULL;

ALTER TABLE revenues
  ALTER COLUMN revenue_category SET DEFAULT 'other';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'revenues_revenue_category_check'
  ) THEN
    ALTER TABLE revenues
      ADD CONSTRAINT revenues_revenue_category_check
      CHECK (revenue_category IN ('client', 'goods_sale', 'other'));
  END IF;
END $$;

ALTER TABLE revenues
  ALTER COLUMN revenue_category SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_revenues_company_client
  ON revenues (company_id, client_id, expected_date DESC);

CREATE INDEX IF NOT EXISTS idx_revenues_company_category
  ON revenues (company_id, revenue_category, expected_date DESC);

ALTER TABLE revenue_clients ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'revenue_clients' AND policyname = 'revenue_clients_select_auth'
  ) THEN
    CREATE POLICY revenue_clients_select_auth ON revenue_clients
      FOR SELECT USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'revenue_clients' AND policyname = 'revenue_clients_insert_auth'
  ) THEN
    CREATE POLICY revenue_clients_insert_auth ON revenue_clients
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'revenue_clients' AND policyname = 'revenue_clients_update_auth'
  ) THEN
    CREATE POLICY revenue_clients_update_auth ON revenue_clients
      FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'revenue_clients' AND policyname = 'revenue_clients_delete_auth'
  ) THEN
    CREATE POLICY revenue_clients_delete_auth ON revenue_clients
      FOR DELETE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
