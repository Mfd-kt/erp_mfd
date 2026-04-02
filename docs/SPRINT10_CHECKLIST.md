# Sprint 10 – Production readiness checklist

## 1. Background jobs (cron / scheduler)

| Item | Status | Notes |
|------|--------|-------|
| Table `job_runs` | ✅ | id, job_name, status, result_json, error_message, started_at, completed_at |
| Recurring generation job | ✅ | `runRecurringGenerationJob()` – daily |
| Webhook retry job | ✅ | `runWebhookRetryJob()` – retries failed deliveries |
| Cron endpoint | ✅ | `GET /api/cron/jobs?job=all\|recurring_generation\|webhook_retry` |
| CRON_SECRET | ⚠️ | À définir dans `.env.local` et chez le fournisseur de cron |
| Planification externe | ⚠️ | Vercel Cron, cron-job.org, ou équivalent |

## 2. Error handling & monitoring

| Item | Status | Notes |
|------|--------|-------|
| Table `error_logs` | ✅ | service_name, function_name, error_message, stack, metadata |
| `logError()` | ✅ | `src/lib/errors/logger.ts` |
| `withErrorLogging()` | ✅ | Wrapper pour actions |
| Intégration payments | ✅ | `logError` dans actions |
| Page admin erreurs | ✅ | `/app/admin/errors` |

## 3. Data integrity

| Item | Status | Notes |
|------|--------|-------|
| payments.amount > 0 | ✅ | Contrainte DB |
| revenues.amount_received <= amount_expected | ✅ | Contrainte DB |
| debts.amount_company_currency > 0 | ✅ | Contrainte DB |
| Index company_id, due_date, created_at | ✅ | Migration 20250320000001 |
| Validation Zod | ✅ | Schemas existants (payment, revenue) |

## 4. Security & secrets

| Item | Status | Notes |
|------|--------|-------|
| Webhook signature (HMAC-SHA256) | ✅ | `signPayload()`, `verifySignature()` |
| Secrets en env | ✅ | CRON_SECRET, SUPABASE_*, WEBHOOK_SECRET |
| RLS | ⚠️ | Vérifier job_runs, error_logs, webhook_deliveries (admin) |

## 5. Backups & recovery

| Item | Status | Notes |
|------|--------|-------|
| Documentation | ✅ | `docs/BACKUP_AND_RECOVERY.md` |
| Stratégie Supabase | ✅ | Documentée |
| Processus de restauration | ✅ | Documenté |

## 6. Webhook reliability

| Item | Status | Notes |
|------|--------|-------|
| Table `webhook_deliveries` | ✅ | webhook_id, event_type, payload, status, attempts |
| Retry job | ✅ | Max 3 tentatives pour les failed |
| Statuts pending/success/failed | ✅ | CHECK constraint |

## 7. Admin pages

| Item | Status | Notes |
|------|--------|-------|
| /app/admin/jobs | ✅ | Liste des job_runs |
| /app/admin/errors | ✅ | Liste des error_logs |
| Layout admin | ✅ | Sous-nav Jobs / Erreurs |
| Accès group_admin | ✅ | Restriction par rôle |

## 8. Tests

| Item | Status | Notes |
|------|--------|-------|
| Vitest config | ✅ | `vitest.config.ts` |
| paymentSchema | ✅ | Rejette 0, négatif ; accepte valide |
| receiveRevenueSchema | ✅ | Rejette négatif ; accepte valide |
| Commande | ✅ | `npm run test` |

## Actions post-déploiement

1. **Variables d'environnement**
   - `CRON_SECRET` : secret partagé avec le service cron
   - `WEBHOOK_SECRET` (optionnel) : pour signer les payloads webhook

2. **Planification cron**
   - Exemple Vercel : `vercel.json` avec `crons` pointant vers `/api/cron/jobs`
   - Exemple cron-job.org : GET quotidien avec header `Authorization: Bearer <CRON_SECRET>`

3. **Migrations**
   - `supabase db push` ou exécution manuelle des migrations 20250320*

4. **Vérification RLS**
   - S'assurer que seuls les `group_admin` accèdent à job_runs, error_logs
