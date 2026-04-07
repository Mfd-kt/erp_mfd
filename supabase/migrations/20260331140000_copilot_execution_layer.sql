-- Couche exécution : décisions, briefings journaliers, journal d'actions agent.

-- ---------------------------------------------------------------------------
-- copilot_decisions : cycle de vie des recommandations (hors seul statut assistant)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS copilot_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_id uuid NOT NULL,
  conversation_id uuid,
  decision_type text NOT NULL CHECK (decision_type IN ('accepted', 'rejected', 'postponed')),
  decided_at timestamptz NOT NULL DEFAULT now(),
  executed boolean NOT NULL DEFAULT false,
  executed_at timestamptz,
  delay_days integer CHECK (delay_days IS NULL OR delay_days >= 0),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_decisions_user_decided ON copilot_decisions (user_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_decisions_reco ON copilot_decisions (recommendation_id);
CREATE INDEX IF NOT EXISTS idx_copilot_decisions_user_executed ON copilot_decisions (user_id, executed, decided_at DESC);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistant_recommendations')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'copilot_decisions_recommendation_id_fkey') THEN
    ALTER TABLE copilot_decisions
      ADD CONSTRAINT copilot_decisions_recommendation_id_fkey
      FOREIGN KEY (recommendation_id) REFERENCES assistant_recommendations(id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistant_conversations')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'copilot_decisions_conversation_id_fkey') THEN
    ALTER TABLE copilot_decisions
      ADD CONSTRAINT copilot_decisions_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES assistant_conversations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- copilot_daily_briefings : cache du briefing généré (1 / jour / user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS copilot_daily_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date date NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, briefing_date)
);

CREATE INDEX IF NOT EXISTS idx_copilot_daily_briefings_user_date ON copilot_daily_briefings (user_id, briefing_date DESC);

-- ---------------------------------------------------------------------------
-- copilot_agent_action_logs : traçabilité executor
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS copilot_agent_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,
  action_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_status text NOT NULL CHECK (result_status IN ('success', 'skipped', 'blocked', 'error')),
  result_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_agent_logs_user_created ON copilot_agent_action_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_agent_logs_conversation ON copilot_agent_action_logs (conversation_id)
  WHERE conversation_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistant_conversations')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'copilot_agent_action_logs_conversation_id_fkey') THEN
    ALTER TABLE copilot_agent_action_logs
      ADD CONSTRAINT copilot_agent_action_logs_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES assistant_conversations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE copilot_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_daily_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_agent_action_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_decisions_select ON copilot_decisions;
DROP POLICY IF EXISTS copilot_decisions_insert ON copilot_decisions;
DROP POLICY IF EXISTS copilot_decisions_update ON copilot_decisions;
DROP POLICY IF EXISTS copilot_decisions_delete ON copilot_decisions;
CREATE POLICY copilot_decisions_select ON copilot_decisions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY copilot_decisions_insert ON copilot_decisions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY copilot_decisions_update ON copilot_decisions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY copilot_decisions_delete ON copilot_decisions FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS copilot_daily_briefings_select ON copilot_daily_briefings;
DROP POLICY IF EXISTS copilot_daily_briefings_insert ON copilot_daily_briefings;
DROP POLICY IF EXISTS copilot_daily_briefings_update ON copilot_daily_briefings;
DROP POLICY IF EXISTS copilot_daily_briefings_delete ON copilot_daily_briefings;
CREATE POLICY copilot_daily_briefings_select ON copilot_daily_briefings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY copilot_daily_briefings_insert ON copilot_daily_briefings FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY copilot_daily_briefings_update ON copilot_daily_briefings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY copilot_daily_briefings_delete ON copilot_daily_briefings FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS copilot_agent_action_logs_select ON copilot_agent_action_logs;
DROP POLICY IF EXISTS copilot_agent_action_logs_insert ON copilot_agent_action_logs;
CREATE POLICY copilot_agent_action_logs_select ON copilot_agent_action_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY copilot_agent_action_logs_insert ON copilot_agent_action_logs FOR INSERT WITH CHECK (user_id = auth.uid());