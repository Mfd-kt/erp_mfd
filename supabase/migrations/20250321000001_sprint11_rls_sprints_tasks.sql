-- Sprint 11: RLS for sprints, tasks, daily_plans, notification_channels, scheduled_notifications

ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- sprints: user sees sprints for their companies or global (authenticated)
CREATE POLICY sprints_select ON sprints FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      scope_type = 'global'
      OR company_id IS NULL
      OR company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND company_id IS NOT NULL)
      OR company_id IN (SELECT c.id FROM companies c JOIN memberships m ON m.group_id = c.group_id WHERE m.user_id = auth.uid() AND m.company_id IS NULL)
    )
  );

CREATE POLICY sprints_insert ON sprints FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY sprints_update ON sprints FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY sprints_delete ON sprints FOR DELETE USING (auth.uid() IS NOT NULL);

-- tasks: same logic
CREATE POLICY tasks_select ON tasks FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      scope_type = 'global'
      OR company_id IS NULL
      OR company_id IN (SELECT company_id FROM memberships WHERE user_id = auth.uid() AND company_id IS NOT NULL)
      OR company_id IN (SELECT c.id FROM companies c JOIN memberships m ON m.group_id = c.group_id WHERE m.user_id = auth.uid() AND m.company_id IS NULL)
    )
  );

CREATE POLICY tasks_insert ON tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY tasks_update ON tasks FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY tasks_delete ON tasks FOR DELETE USING (auth.uid() IS NOT NULL);

-- daily_plans: user owns their plans
CREATE POLICY daily_plans_select ON daily_plans FOR SELECT USING (user_id = auth.uid());
CREATE POLICY daily_plans_insert ON daily_plans FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY daily_plans_update ON daily_plans FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY daily_plans_delete ON daily_plans FOR DELETE USING (user_id = auth.uid());

-- notification_channels: user owns their channels
CREATE POLICY notification_channels_select ON notification_channels FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notification_channels_insert ON notification_channels FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY notification_channels_update ON notification_channels FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY notification_channels_delete ON notification_channels FOR DELETE USING (user_id = auth.uid());

-- scheduled_notifications: read via task/sprint access
CREATE POLICY scheduled_notifications_select ON scheduled_notifications FOR SELECT USING (true);
CREATE POLICY scheduled_notifications_insert ON scheduled_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY scheduled_notifications_update ON scheduled_notifications FOR UPDATE USING (true);
