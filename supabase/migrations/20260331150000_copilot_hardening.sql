-- Hardening copilote : logs d’audit enrichis, intégrité décisions.

ALTER TABLE copilot_agent_action_logs
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS error_category text CHECK (
    error_category IS NULL OR error_category IN (
      'validation', 'policy', 'permission', 'database', 'integration', 'unknown'
    )
  ),
  ADD COLUMN IF NOT EXISTS retryable boolean,
  ADD COLUMN IF NOT EXISTS audit_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_copilot_agent_logs_category_created
  ON copilot_agent_action_logs (error_category, created_at DESC)
  WHERE error_category IS NOT NULL;

-- Au plus une décision « acceptée » non exécutée par recommandation (évite doublons UI).
CREATE UNIQUE INDEX IF NOT EXISTS idx_copilot_decisions_one_pending_accepted
  ON copilot_decisions (user_id, recommendation_id)
  WHERE decision_type = 'accepted' AND executed = false;