-- Sprint 11.1: RLS for notification_preferences

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select ON notification_preferences
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notification_preferences_insert ON notification_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_update ON notification_preferences
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY notification_preferences_delete ON notification_preferences
  FOR DELETE USING (user_id = auth.uid());
