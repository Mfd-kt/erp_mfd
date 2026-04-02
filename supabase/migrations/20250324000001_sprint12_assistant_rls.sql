-- Sprint 12: RLS for assistant tables

ALTER TABLE assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_runs ENABLE ROW LEVEL SECURITY;

-- assistant_conversations: user owns
CREATE POLICY assistant_conversations_select ON assistant_conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY assistant_conversations_insert ON assistant_conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY assistant_conversations_update ON assistant_conversations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY assistant_conversations_delete ON assistant_conversations FOR DELETE USING (user_id = auth.uid());

-- assistant_messages: via conversation ownership
CREATE POLICY assistant_messages_select ON assistant_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM assistant_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY assistant_messages_insert ON assistant_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM assistant_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY assistant_messages_delete ON assistant_messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM assistant_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

-- assistant_memories: user owns
CREATE POLICY assistant_memories_select ON assistant_memories FOR SELECT USING (user_id = auth.uid());
CREATE POLICY assistant_memories_insert ON assistant_memories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY assistant_memories_update ON assistant_memories FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY assistant_memories_delete ON assistant_memories FOR DELETE USING (user_id = auth.uid());

-- assistant_recommendations: user owns
CREATE POLICY assistant_recommendations_select ON assistant_recommendations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY assistant_recommendations_insert ON assistant_recommendations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY assistant_recommendations_update ON assistant_recommendations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY assistant_recommendations_delete ON assistant_recommendations FOR DELETE USING (user_id = auth.uid());

-- assistant_runs: user owns
CREATE POLICY assistant_runs_select ON assistant_runs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY assistant_runs_insert ON assistant_runs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY assistant_runs_update ON assistant_runs FOR UPDATE USING (user_id = auth.uid());
