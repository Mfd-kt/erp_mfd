-- =============================================================================
-- VIDER COMPLÈTEMENT LA BASE — Toutes les entrées de toutes les tables
-- =============================================================================
-- Exécuter dans Supabase SQL Editor.
-- ATTENTION : Opération irréversible. À utiliser en dev/test uniquement.
-- =============================================================================
-- Ne tronque que les tables qui existent (évite erreur 42P01 si migration pas appliquée).

DO $$
DECLARE
  -- Ordre : tables enfants / dépendantes en premier, puis le reste (CASCADE aide aussi).
  all_tables text[] := ARRAY[
    'copilot_feedback_events',
    'copilot_agent_action_logs',
    'copilot_daily_briefings',
    'copilot_decisions',
    'copilot_behavior_signals',
    'copilot_memory_items',
    'copilot_user_profile',
    'assistant_tool_calls',
    'assistant_pending_actions',
    'assistant_feedback',
    'assistant_messages',
    'assistant_conversations',
    'assistant_memories',
    'assistant_recommendations',
    'assistant_runs',
    'scheduled_notifications',
    'notification_channels',
    'notification_preferences',
    'daily_plans',
    'tasks',
    'sprints',
    'job_runs',
    'error_logs',
    'exchange_rates',
    'webhook_deliveries',
    'webhooks',
    'activity_logs',
    'notifications',
    'automation_rules',
    'recurring_rules',
    'payments',
    'debts',
    'revenues',
    'accounts',
    'debt_categories',
    'debt_types',
    'creditors',
    'memberships',
    'companies',
    'groups',
    'countries',
    'currencies'
  ];
  t text;
  existing text[] := ARRAY[]::text[];
  stmt text;
BEGIN
  FOREACH t IN ARRAY all_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      existing := array_append(existing, t);
    END IF;
  END LOOP;

  IF coalesce(array_length(existing, 1), 0) = 0 THEN
    RAISE NOTICE 'Aucune table listée n''existe — rien à tronquer.';
    RETURN;
  END IF;

  SELECT 'TRUNCATE TABLE ' || string_agg(format('public.%I', x), ', ') || ' CASCADE'
  INTO stmt
  FROM unnest(existing) AS x;

  EXECUTE stmt;
END $$;
