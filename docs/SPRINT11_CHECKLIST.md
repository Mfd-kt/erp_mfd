# Sprint 11 – Intelligent execution layer – Checklist

## 1. Data model

| Table | Status |
|-------|--------|
| sprints | ✅ |
| tasks | ✅ |
| daily_plans | ✅ |
| notification_channels | ✅ |
| scheduled_notifications | ✅ |

## 2. Core logic

| Feature | Status |
|---------|--------|
| Sprints (business / personal / global) | ✅ |
| Tasks (with/without sprint) | ✅ |
| Sprint progress (completed / total) | ✅ |

## 3. Smart daily planning

| Feature | Status |
|---------|--------|
| generateDailyPlan service | ✅ |
| 1 important + 2 secondary tasks | ✅ |
| Scoring: overdue > critical alerts > active sprint > due soon > priority | ✅ |
| Max 3 tasks in plan | ✅ |

## 4. Task creation from alerts

| Feature | Status |
|---------|--------|
| "Créer tâche" on AlertCard | ✅ |
| linked_entity_type / linked_entity_id | ✅ |

## 5. Notification channels

| Feature | Status |
|---------|--------|
| Slack adapter (webhook) | ✅ |
| WhatsApp adapter (foundation) | ✅ |
| sendToChannel | ✅ |

## 6. Pages

| Page | Status |
|------|--------|
| /app/sprints | ✅ |
| /app/sprints/new | ✅ |
| /app/sprints/[sprintId] | ✅ |
| /app/tasks | ✅ |
| /app/tasks/new | ✅ |
| /app/planning | ✅ |
| /app/notifications/channels | ✅ |

## 7. Sidebar

| Link | Status |
|------|--------|
| Plan du jour | ✅ |
| Sprints | ✅ |
| Tâches | ✅ |
| Canaux | ✅ |

## 8. Migrations

- `20250321000000_sprint11_sprints_tasks_planning.sql`
- `20250321000001_sprint11_rls_sprints_tasks.sql`

## Post-déploiement

1. Exécuter les migrations : `supabase db push`
2. Slack : créer un Incoming Webhook, coller l’URL dans Canaux
3. WhatsApp : intégration à compléter (Twilio, etc.)
