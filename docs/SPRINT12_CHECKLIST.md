# Sprint 12 – AI Financial Copilot

## Objectifs

Construire un copilote financier IA connecté à l'ERP :
- Contexte business + personnel
- Briefing quotidien proactif
- Recommandations actionnables
- Conversations persistantes
- Mémoire contrôlée
- Intégration Slack/WhatsApp
- Jamais inventer de données
- Actions sensibles avec confirmation

---

## 1. Architecture

- **OpenAI Chat Completions API** avec tool/function calling
- **Orchestration serveur** – aucun accès DB direct par le modèle
- **Mémoire contrôlée** – préférences explicites, pas d'auto-apprentissage
- **Outils sécurisés** – tout accès ERP via fonctions typées

---

## 2. Modèle de données

| Table | Description |
|-------|-------------|
| `assistant_conversations` | Conversations (user, scope, title, status) |
| `assistant_messages` | Messages (conversation, role, content) |
| `assistant_memories` | Mémoire (user, key, value_json, source) |
| `assistant_recommendations` | Recommandations (title, severity, status) |
| `assistant_runs` | Exécutions (daily_digest, chat, etc.) |

Migrations : `20250324000000_sprint12_assistant_tables.sql`, `20250324000001_sprint12_assistant_rls.sql`

---

## 3. Outils (tools)

### Read tools
- `get_global_dashboard` – tableau de bord groupe
- `get_company_dashboard` – tableau société
- `get_global_forecast` – prévision groupe
- `get_company_forecast` – prévision société
- `get_overdue_debts` – dettes en retard
- `get_due_soon_debts` – dettes à échéance
- `get_unreceived_revenues` – revenus non encaissés
- `get_recent_alerts` – alertes récentes
- `get_daily_plan` – plan du jour
- `get_open_tasks` – tâches ouvertes
- `get_sprint_summary` – résumé sprint
- `get_safe_withdrawal_capacity` – capacité de retrait sécurisée

### Action tools
- `create_task` – créer une tâche
- `create_recommendation` – créer une recommandation
- `send_slack_notification` – envoyer via Slack

---

## 4. Pages

| Route | Description |
|-------|-------------|
| `/app/assistant` | Accueil : briefing, nouvelles conversations, prompts rapides |
| `/app/assistant/[conversationId]` | Chat avec panneau contexte |
| `/app/assistant/recommendations` | Liste des recommandations |

---

## 5. Cron

- `?job=daily_assistant` – lance le digest pour les utilisateurs avec `enable_daily_plan`
- Génère un briefing, enregistre dans `assistant_runs`, envoie via Slack si configuré

---

## 6. Variables d'environnement

- `OPENAI_API_KEY` – clé API OpenAI
- `OPENAI_MODEL` – modèle (défaut : `gpt-4o-mini`)

---

## 7. Mémoire

- `assistant_memories` : stockage clé-valeur avec source (`explicit_feedback`, `behavior`, `system_rule`)
- Format pour le prompt : `formatMemoriesForPrompt()`
- Pas d'auto-modification des règles

---

## 8. Sécurité

- Tous les reads respectent le scope d'accès (companies)
- Tous les appels sont côté serveur
- Actions sensibles (créer sprint, notification externe) : confirmation requise

---

## 9. Fichiers créés

| Fichier | Rôle |
|---------|------|
| `src/modules/assistant/types.ts` | Types |
| `src/modules/assistant/queries.ts` | Requêtes |
| `src/modules/assistant/actions.ts` | Actions serveur |
| `src/modules/assistant/memory.ts` | Mémoire |
| `src/modules/assistant/prompt.ts` | Prompt système |
| `src/modules/assistant/tools.ts` | Outils read + action |
| `src/modules/assistant/service.ts` | Orchestration chat |
| `src/modules/assistant/daily-digest.ts` | Digest quotidien |
| `src/modules/assistant/components/*` | UI |
| `src/app/app/assistant/**` | Pages |
| `src/app/api/assistant/recommendations/route.ts` | API recommandations |
