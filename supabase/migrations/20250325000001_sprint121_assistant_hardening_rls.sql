-- Sprint 12.1: RLS for new assistant tables

ALTER TABLE assistant_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_pending_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_feedback ENABLE ROW LEVEL SECURITY;

-- assistant_tool_calls: user owns (user_id) or via run/conversation
CREATE POLICY assistant_tool_calls_select ON assistant_tool_calls FOR SELECT
  USING (
    user_id = auth.uid()
    OR (run_id IS NOT NULL AND EXISTS (SELECT 1 FROM assistant_runs r WHERE r.id = run_id AND r.user_id = auth.uid()))
    OR (conversation_id IS NOT NULL AND EXISTS (SELECT 1 FROM assistant_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
  );
CREATE POLICY assistant_tool_calls_insert ON assistant_tool_calls FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- assistant_pending_actions: user owns
CREATE POLICY assistant_pending_actions_select ON assistant_pending_actions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY assistant_pending_actions_insert ON assistant_pending_actions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY assistant_pending_actions_update ON assistant_pending_actions FOR UPDATE USING (user_id = auth.uid());

-- assistant_feedback: user owns
CREATE POLICY assistant_feedback_select ON assistant_feedback FOR SELECT USING (user_id = auth.uid());
CREATE POLICY assistant_feedback_insert ON assistant_feedback FOR INSERT WITH CHECK (user_id = auth.uid());
