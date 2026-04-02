-- Sprint 11.1: add plan_metadata to daily_plans for storing task reasons

ALTER TABLE daily_plans
  ADD COLUMN IF NOT EXISTS plan_metadata jsonb DEFAULT '{}';

COMMENT ON COLUMN daily_plans.plan_metadata IS 'Computed metadata: task_reasons, etc.';
