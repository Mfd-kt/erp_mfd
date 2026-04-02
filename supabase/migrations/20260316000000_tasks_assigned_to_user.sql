-- Tasks: optional assignee (team member of company/group)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS assigned_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_user
  ON tasks (assigned_to_user_id)
  WHERE assigned_to_user_id IS NOT NULL;
