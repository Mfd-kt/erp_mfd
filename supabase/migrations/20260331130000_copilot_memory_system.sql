-- Copilot: profil utilisateur, mémoire structurée, signaux comportementaux, événements de feedback.
-- Compatible si les tables assistant_* ne sont pas encore déployées (FK ajoutées seulement si les tables existent).

-- ---------------------------------------------------------------------------
-- 1) Extensions assistant (uniquement si les tables existent)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'assistant_conversations'
  ) THEN
    ALTER TABLE assistant_conversations
      ADD COLUMN IF NOT EXISTS conversation_type text DEFAULT 'finance';
    -- Contrainte CHECK : ignorer si déjà satisfaite (colonne existante avec données)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'assistant_conversations_conversation_type_check'
    ) THEN
      ALTER TABLE assistant_conversations
        ADD CONSTRAINT assistant_conversations_conversation_type_check
        CHECK (conversation_type IN ('finance', 'planning', 'review', 'other'));
    END IF;
    ALTER TABLE assistant_conversations
      ALTER COLUMN conversation_type SET DEFAULT 'finance';
    UPDATE assistant_conversations SET conversation_type = 'finance' WHERE conversation_type IS NULL;
    ALTER TABLE assistant_conversations
      ALTER COLUMN conversation_type SET NOT NULL;

    ALTER TABLE assistant_conversations
      ADD COLUMN IF NOT EXISTS context_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

    CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_type
      ON assistant_conversations (user_id, conversation_type);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'assistant_recommendations'
  ) THEN
    ALTER TABLE assistant_recommendations
      ADD COLUMN IF NOT EXISTS conversation_id uuid;
    ALTER TABLE assistant_recommendations
      ADD COLUMN IF NOT EXISTS description text;

    CREATE INDEX IF NOT EXISTS idx_assistant_recommendations_conversation
      ON assistant_recommendations (conversation_id)
      WHERE conversation_id IS NOT NULL;

    COMMENT ON COLUMN assistant_recommendations.description IS 'Texte descriptif (alias sémantique de body ; body conservé pour compatibilité)';
  END IF;
END $$;

-- FK conversation_id → assistant_conversations (si les deux tables existent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistant_conversations')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistant_recommendations')
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'assistant_recommendations_conversation_id_fkey'
     ) THEN
    ALTER TABLE assistant_recommendations
      ADD CONSTRAINT assistant_recommendations_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES assistant_conversations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Tables copilot (sans dépendre de assistant_* pour la création)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS copilot_user_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_tone text,
  preferred_output_style text,
  dominant_focus text,
  estimated_risk_tolerance text,
  decision_style text,
  recurring_topics text[] NOT NULL DEFAULT '{}',
  recurring_biases text[] NOT NULL DEFAULT '{}',
  strong_patterns text[] NOT NULL DEFAULT '{}',
  last_profile_update_at timestamptz,
  profile_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_user_profile_updated ON copilot_user_profile (last_profile_update_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS copilot_memory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type text NOT NULL CHECK (memory_type IN (
    'preference', 'habit', 'operational', 'decision_pattern', 'topic', 'risk_note', 'explicit_user'
  )),
  key text NOT NULL,
  value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric(4,3) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1) DEFAULT 0.5,
  source_count integer NOT NULL DEFAULT 1 CHECK (source_count >= 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, memory_type, key)
);

CREATE INDEX IF NOT EXISTS idx_copilot_memory_items_user_active ON copilot_memory_items (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_copilot_memory_items_user_type ON copilot_memory_items (user_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_copilot_memory_items_last_seen ON copilot_memory_items (user_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS copilot_behavior_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'attention')),
  description text NOT NULL,
  supporting_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_copilot_behavior_signals_user_active ON copilot_behavior_signals (user_id, is_active, detected_at DESC);

-- Colonnes uuid sans FK inline (FK ajoutées ci-dessous si assistant_* existe)
CREATE TABLE IF NOT EXISTS copilot_feedback_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,
  recommendation_id uuid,
  feedback_type text NOT NULL CHECK (feedback_type IN (
    'recommendation_accepted',
    'recommendation_dismissed',
    'recommendation_done',
    'memory_created',
    'memory_updated',
    'memory_deactivated',
    'profile_updated',
    'signal_acknowledged',
    'other'
  )),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_copilot_feedback_events_user ON copilot_feedback_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_feedback_events_reco ON copilot_feedback_events (recommendation_id)
  WHERE recommendation_id IS NOT NULL;

-- FK optionnelles vers assistant_* (après création de la table copilot)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistant_conversations')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'copilot_feedback_events_conversation_id_fkey') THEN
    ALTER TABLE copilot_feedback_events
      ADD CONSTRAINT copilot_feedback_events_conversation_id_fkey
      FOREIGN KEY (conversation_id) REFERENCES assistant_conversations(id) ON DELETE SET NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistant_recommendations')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'copilot_feedback_events_recommendation_id_fkey') THEN
    ALTER TABLE copilot_feedback_events
      ADD CONSTRAINT copilot_feedback_events_recommendation_id_fkey
      FOREIGN KEY (recommendation_id) REFERENCES assistant_recommendations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3) RLS (idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE copilot_user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_memory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_behavior_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE copilot_feedback_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_user_profile_select ON copilot_user_profile;
DROP POLICY IF EXISTS copilot_user_profile_insert ON copilot_user_profile;
DROP POLICY IF EXISTS copilot_user_profile_update ON copilot_user_profile;
DROP POLICY IF EXISTS copilot_user_profile_delete ON copilot_user_profile;
CREATE POLICY copilot_user_profile_select ON copilot_user_profile FOR SELECT USING (user_id = auth.uid());
CREATE POLICY copilot_user_profile_insert ON copilot_user_profile FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY copilot_user_profile_update ON copilot_user_profile FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY copilot_user_profile_delete ON copilot_user_profile FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS copilot_memory_items_select ON copilot_memory_items;
DROP POLICY IF EXISTS copilot_memory_items_insert ON copilot_memory_items;
DROP POLICY IF EXISTS copilot_memory_items_update ON copilot_memory_items;
DROP POLICY IF EXISTS copilot_memory_items_delete ON copilot_memory_items;
CREATE POLICY copilot_memory_items_select ON copilot_memory_items FOR SELECT USING (user_id = auth.uid());
CREATE POLICY copilot_memory_items_insert ON copilot_memory_items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY copilot_memory_items_update ON copilot_memory_items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY copilot_memory_items_delete ON copilot_memory_items FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS copilot_behavior_signals_select ON copilot_behavior_signals;
DROP POLICY IF EXISTS copilot_behavior_signals_insert ON copilot_behavior_signals;
DROP POLICY IF EXISTS copilot_behavior_signals_update ON copilot_behavior_signals;
DROP POLICY IF EXISTS copilot_behavior_signals_delete ON copilot_behavior_signals;
CREATE POLICY copilot_behavior_signals_select ON copilot_behavior_signals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY copilot_behavior_signals_insert ON copilot_behavior_signals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY copilot_behavior_signals_update ON copilot_behavior_signals FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY copilot_behavior_signals_delete ON copilot_behavior_signals FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS copilot_feedback_events_select ON copilot_feedback_events;
DROP POLICY IF EXISTS copilot_feedback_events_insert ON copilot_feedback_events;
CREATE POLICY copilot_feedback_events_select ON copilot_feedback_events FOR SELECT USING (user_id = auth.uid());
CREATE POLICY copilot_feedback_events_insert ON copilot_feedback_events FOR INSERT WITH CHECK (user_id = auth.uid());