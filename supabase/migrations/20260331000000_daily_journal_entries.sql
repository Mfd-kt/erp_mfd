-- Sprint A: personal daily journal (per user, per calendar date)

CREATE TABLE IF NOT EXISTS daily_journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journal_date date NOT NULL,
  mood integer NOT NULL CHECK (mood BETWEEN 1 AND 5),
  energy_level text NOT NULL CHECK (energy_level IN ('low', 'medium', 'high')),
  accomplished text,
  what_failed text,
  intentions_tomorrow text,
  overall_rating integer CHECK (overall_rating IS NULL OR overall_rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, journal_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_journal_entries_user_date
  ON daily_journal_entries (user_id, journal_date DESC);

ALTER TABLE daily_journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY daily_journal_entries_select ON daily_journal_entries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY daily_journal_entries_insert ON daily_journal_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY daily_journal_entries_update ON daily_journal_entries
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY daily_journal_entries_delete ON daily_journal_entries
  FOR DELETE USING (user_id = auth.uid());
