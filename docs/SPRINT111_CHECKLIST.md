# Sprint 11.1 – Execution Layer Polish

## Objectifs

Raffiner la couche d'exécution pour la rendre :
- **Fiable** : tâches pertinentes, pas d'obsolescence
- **Explicable** : pourquoi chaque tâche est sélectionnée
- **Fluide** : re-planning intelligent, UX claire
- **Utilisable au quotidien** : notifications, préférences, santé des sprints

---

## 1. Task Relevance (CRITICAL) ✅

### A. Validation des tâches
- **`src/modules/planning/task-validation.ts`** : `filterRelevantTasks()` exclut les tâches dont :
  - la dette liée est payée
  - le revenu lié est reçu
  - l'alerte liée est résolue
  - le statut est done/cancelled

### B. Auto-clôture
- **`src/modules/tasks/auto-close.ts`** : `autoCloseObsoleteTasks()` marque `done` les tâches dont l'entité liée est résolue
- Log d'activité : `task_auto_completed` avec metadata `reason` (ex. "Dette payée")

---

## 2. Explainable Daily Plan ✅

- **`src/modules/planning/reason-formatter.ts`** : `formatTaskReason()` convertit les codes en raisons lisibles
- **`plan_metadata`** sur `daily_plans` : `{ primary, secondary1, secondary2 }` (raisons formatées)
- **PlanningView** : affiche la raison sous chaque tâche (texte muted)

---

## 3. Smart Re-planning ✅

- Bouton **"Recalculer le plan"** avec toggle **"Garder la tâche principale"**
- `regenerateDailyPlan(planDate, { keepPrimary: true })` conserve la tâche principale
- Pas de doublons ni de tâches terminées (via `filterRelevantTasks`)

---

## 4. Sprint Health ✅

- **`src/modules/sprints/health.ts`** : `computeSprintHealth()` retourne :
  - `on_track` / `at_risk` / `delayed`
  - `timeProgressPercent`, `taskCompletionPercent`, `label`
- Badge coloré sur la page sprint détail

---

## 5. Notification Preferences ✅

- **Table** : `notification_preferences` (user_id, morning_time, evening_time, channels_enabled, enable_daily_plan, enable_overdue_alerts, enable_sprint_alerts)
- **Page** : `/app/notifications/preferences`
- **UI** : sélection des heures, canaux (Slack, WhatsApp), toggles par type
- **Test** : bouton "Tester une notification" (utilise le webhook Slack configuré dans Canaux)

---

## 6. Daily Plan Notifications ✅

- **`src/modules/notifications/daily/service.ts`** : `runDailyNotificationsJob()`
- **Matin** : envoi du plan (1 principale + 2 secondaires) via Slack
- **Soir** : résumé (terminées / non terminées)
- **Cron** : `GET /api/cron/jobs?job=daily_notifications` ou `?job=all`
- Plan généré automatiquement si absent au moment de l'envoi

---

## 7. Task UX Polish ✅

- **TaskRow** :
  - Indicateur de statut (pastille colorée)
  - Label de raison (optionnel)
  - Actions inline : "Démarrer", "Terminé"
  - Select de statut conservé

---

## 8. Planning Page UX ✅

- Progression du jour : "X/3 tâches terminées"
- Tâche principale en grand, secondaires en grille
- Notes optionnelles (sauvegarde au blur)
- Toggle "Garder la tâche principale" + bouton "Recalculer le plan"

---

## 9. Activity Log ✅

- `task_auto_completed` : label "Tâche auto-complétée"
- Message lisible : "(Dette payée)" ou "(Revenu reçu)" via `formatActivityMetadata`
- Filtres : action_type, entity_type (task ajouté)

---

## 10. Migrations

| Fichier | Description |
|---------|-------------|
| `20250323000000_sprint111_notification_preferences.sql` | Table notification_preferences |
| `20250323000001_sprint111_daily_plans_metadata.sql` | Colonne plan_metadata sur daily_plans |
| `20250323000002_sprint111_notification_preferences_rls.sql` | RLS notification_preferences |

---

## 11. Cron

Appeler régulièrement (ex. toutes les heures) :
```
GET /api/cron/jobs?job=all
Authorization: Bearer <CRON_SECRET>
```

Ou ciblé :
```
?job=daily_notifications
```

---

## 12. Fichiers créés/modifiés

| Fichier | Action |
|---------|--------|
| `src/modules/planning/task-validation.ts` | Créé |
| `src/modules/planning/reason-formatter.ts` | Créé |
| `src/modules/planning/service.ts` | Modifié (keepPrimary, taskReasons) |
| `src/modules/planning/actions.ts` | Modifié (regenerate avec keepPrimary) |
| `src/modules/planning/queries.ts` | Modifié (plan_metadata, supabase optionnel) |
| `src/modules/planning/components/PlanningView.tsx` | Modifié (raisons, progression, notes, recalcul) |
| `src/modules/sprints/health.ts` | Créé |
| `src/app/app/sprints/[sprintId]/page.tsx` | Modifié (badge santé) |
| `src/modules/tasks/auto-close.ts` | Créé |
| `src/modules/notifications/preferences/*` | Créé (queries, actions, form) |
| `src/modules/notifications/daily/service.ts` | Créé |
| `src/app/app/notifications/preferences/page.tsx` | Créé |
| `src/lib/supabase/server.ts` | Modifié (createServiceClient) |
| `src/app/api/cron/jobs/route.ts` | Modifié (daily_notifications) |
| `src/modules/tasks/components/TaskRow.tsx` | Modifié (statut, actions inline) |
| `src/modules/activity/formatters/metadata.ts` | Modifié (task_auto_completed) |
| `src/app/app/[companyId]/activity/page.tsx` | Modifié (labels, filtres) |
