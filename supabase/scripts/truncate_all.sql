-- =============================================================================
-- VIDER COMPLÈTEMENT LA BASE — Toutes les entrées de toutes les tables
-- =============================================================================
-- Exécuter dans Supabase SQL Editor.
-- ATTENTION : Opération irréversible. À utiliser en dev/test uniquement.
-- =============================================================================

-- Une seule commande TRUNCATE avec CASCADE pour gérer toutes les dépendances FK
-- (ex. companies → countries, companies → currencies)
TRUNCATE TABLE
  assistant_tool_calls,
  assistant_pending_actions,
  assistant_feedback,
  assistant_messages,
  assistant_conversations,
  assistant_memories,
  assistant_recommendations,
  assistant_runs,
  scheduled_notifications,
  notification_channels,
  notification_preferences,
  daily_plans,
  tasks,
  sprints,
  job_runs,
  error_logs,
  exchange_rates,
  webhook_deliveries,
  webhooks,
  activity_logs,
  notifications,
  automation_rules,
  recurring_rules,
  payments,
  debts,
  revenues,
  accounts,
  debt_categories,
  debt_types,
  creditors,
  memberships,
  companies,
  groups,
  countries,
  currencies
CASCADE;
