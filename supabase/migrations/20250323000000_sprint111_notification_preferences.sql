-- Sprint 11.1: notification_preferences for user-level control

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  morning_time time NOT NULL DEFAULT '08:00',
  evening_time time NOT NULL DEFAULT '18:00',
  channels_enabled jsonb NOT NULL DEFAULT '["slack"]',
  enable_daily_plan boolean NOT NULL DEFAULT true,
  enable_overdue_alerts boolean NOT NULL DEFAULT true,
  enable_sprint_alerts boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences (user_id);
