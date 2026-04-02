-- Sprint 12: AI Financial Copilot - data model

-- A. assistant_conversations
CREATE TABLE IF NOT EXISTS assistant_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('global', 'business', 'personal')) DEFAULT 'global',
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Nouvelle conversation',
  summary text,
  status text NOT NULL CHECK (status IN ('active', 'archived')) DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user ON assistant_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_user_status ON assistant_conversations (user_id, status);
CREATE INDEX IF NOT EXISTS idx_assistant_conversations_last_message ON assistant_conversations (last_message_at DESC NULLS LAST);

-- B. assistant_messages
CREATE TABLE IF NOT EXISTS assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES assistant_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL DEFAULT '',
  metadata_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_conversation ON assistant_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_created ON assistant_messages (conversation_id, created_at);

-- C. assistant_memories
CREATE TABLE IF NOT EXISTS assistant_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  value_json jsonb NOT NULL DEFAULT '{}',
  confidence numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1) DEFAULT 0.8,
  source text NOT NULL CHECK (source IN ('explicit_feedback', 'behavior', 'system_rule')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE INDEX IF NOT EXISTS idx_assistant_memories_user ON assistant_memories (user_id);

-- D. assistant_recommendations
CREATE TABLE IF NOT EXISTS assistant_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('global', 'business', 'personal')) DEFAULT 'global',
  recommendation_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')) DEFAULT 'info',
  title text NOT NULL,
  body text,
  status text NOT NULL CHECK (status IN ('open', 'accepted', 'dismissed', 'done')) DEFAULT 'open',
  linked_entity_type text,
  linked_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_recommendations_user ON assistant_recommendations (user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_recommendations_user_status ON assistant_recommendations (user_id, status);
CREATE INDEX IF NOT EXISTS idx_assistant_recommendations_user_severity ON assistant_recommendations (user_id, severity);

-- E. assistant_runs
CREATE TABLE IF NOT EXISTS assistant_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type text NOT NULL CHECK (trigger_type IN ('daily_digest', 'chat', 'manual_review', 'scheduled')),
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  summary text,
  metadata_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_assistant_runs_user ON assistant_runs (user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_runs_created ON assistant_runs (created_at DESC);
