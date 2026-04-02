-- Sprint 11: Sprints, tasks, daily plans, notification channels

-- A. sprints
CREATE TABLE IF NOT EXISTS sprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('business', 'personal', 'global')),
  title text NOT NULL,
  description text,
  goal text,
  status text NOT NULL CHECK (status IN ('planned', 'active', 'completed', 'cancelled')) DEFAULT 'planned',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_sprint_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_sprints_company_status ON sprints (company_id, status) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sprints_scope_status ON sprints (scope_type, status);
CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints (start_date, end_date);

-- B. tasks
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES sprints(id) ON DELETE SET NULL,
  scope_type text NOT NULL CHECK (scope_type IN ('business', 'personal', 'global')),
  title text NOT NULL,
  description text,
  task_type text NOT NULL CHECK (task_type IN ('important', 'secondary', 'admin', 'follow_up')) DEFAULT 'secondary',
  status text NOT NULL CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')) DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  due_date date,
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  energy_level text NOT NULL DEFAULT 'medium' CHECK (energy_level IN ('low', 'medium', 'high')),
  linked_entity_type text,
  linked_entity_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tasks_company_status ON tasks (company_id, status) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON tasks (sprint_id) WHERE sprint_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_scope_status ON tasks (scope_type, status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_linked ON tasks (linked_entity_type, linked_entity_id) WHERE linked_entity_type IS NOT NULL;

-- C. daily_plans
CREATE TABLE IF NOT EXISTS daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  primary_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  secondary_task_1_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  secondary_task_2_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  notes text,
  status text NOT NULL CHECK (status IN ('draft', 'locked', 'completed')) DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans (user_id, plan_date);

-- D. notification_channels
CREATE TABLE IF NOT EXISTS notification_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_type text NOT NULL CHECK (channel_type IN ('slack', 'whatsapp')),
  is_active boolean NOT NULL DEFAULT true,
  config_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_channels_user ON notification_channels (user_id, channel_type);
CREATE INDEX IF NOT EXISTS idx_notification_channels_company ON notification_channels (company_id) WHERE company_id IS NOT NULL;

-- E. scheduled_notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  sprint_id uuid REFERENCES sprints(id) ON DELETE CASCADE,
  channel_type text NOT NULL CHECK (channel_type IN ('slack', 'whatsapp')),
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  payload_json jsonb NOT NULL DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled ON scheduled_notifications (scheduled_at);
