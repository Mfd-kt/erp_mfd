-- Sprint 12.1: Assistant hardening - tool calls, pending actions, feedback, recommendation fields

-- A. assistant_tool_calls
CREATE TABLE IF NOT EXISTS assistant_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES assistant_runs(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES assistant_conversations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  tool_arguments_json jsonb NOT NULL DEFAULT '{}',
  tool_result_json jsonb,
  status text NOT NULL CHECK (status IN ('started', 'completed', 'failed')) DEFAULT 'started',
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_assistant_tool_calls_run ON assistant_tool_calls (run_id);
CREATE INDEX IF NOT EXISTS idx_assistant_tool_calls_conversation ON assistant_tool_calls (conversation_id);
CREATE INDEX IF NOT EXISTS idx_assistant_tool_calls_status ON assistant_tool_calls (status);
CREATE INDEX IF NOT EXISTS idx_assistant_tool_calls_started ON assistant_tool_calls (started_at DESC);

-- B. assistant_pending_actions
CREATE TABLE IF NOT EXISTS assistant_pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES assistant_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_name text NOT NULL,
  action_payload_json jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'executed', 'failed')) DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  executed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_assistant_pending_actions_user ON assistant_pending_actions (user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_pending_actions_status ON assistant_pending_actions (status);
CREATE INDEX IF NOT EXISTS idx_assistant_pending_actions_conversation ON assistant_pending_actions (conversation_id);

-- C. assistant_feedback
CREATE TABLE IF NOT EXISTS assistant_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES assistant_conversations(id) ON DELETE SET NULL,
  recommendation_id uuid REFERENCES assistant_recommendations(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_feedback_user ON assistant_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_feedback_recommendation ON assistant_feedback (recommendation_id);

-- D. Add columns to assistant_recommendations
ALTER TABLE assistant_recommendations ADD COLUMN IF NOT EXISTS rationale text;
ALTER TABLE assistant_recommendations ADD COLUMN IF NOT EXISTS urgency text CHECK (urgency IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE assistant_recommendations ADD COLUMN IF NOT EXISTS suggested_next_action text;

-- E. Add run_id to assistant_runs for tool call linking (run_id already exists in assistant_tool_calls)
-- assistant_runs.id is used as run_id in assistant_tool_calls
