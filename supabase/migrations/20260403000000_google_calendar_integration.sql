-- Sprint B: Google Calendar OAuth tokens and per-user calendar selections

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expiry timestamptz NOT NULL,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens (user_id);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY google_calendar_tokens_select ON google_calendar_tokens
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY google_calendar_tokens_insert ON google_calendar_tokens
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY google_calendar_tokens_update ON google_calendar_tokens
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY google_calendar_tokens_delete ON google_calendar_tokens
  FOR DELETE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS google_calendar_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_id text NOT NULL,
  calendar_name text NOT NULL,
  color text,
  is_selected boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, calendar_id)
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_selections_user_id ON google_calendar_selections (user_id);

ALTER TABLE google_calendar_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY google_calendar_selections_select ON google_calendar_selections
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY google_calendar_selections_insert ON google_calendar_selections
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY google_calendar_selections_update ON google_calendar_selections
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY google_calendar_selections_delete ON google_calendar_selections
  FOR DELETE USING (user_id = auth.uid());
