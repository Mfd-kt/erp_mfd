# Sprint 5 — Plan et stratégie d’idempotence

## 1. Stratégie d’idempotence (critique)

- **Clé de période déterministe** : chaque dette générée est associée à une clé de période explicite, selon la fréquence :
  - **mensuel** : `YYYY-MM` (ex. `2026-03`)
  - **trimestriel** : `YYYY-Qn` (ex. `2026-Q2`)
  - **annuel** : `YYYY` (ex. `2026`)
- **Contrainte unique en base** : `UNIQUE(source_recurring_rule_id, generated_period_key)` avec une contrainte partielle `WHERE source_recurring_rule_id IS NOT NULL AND generated_period_key IS NOT NULL`. Toute tentative d’insertion d’un second enregistrement pour la même règle et la même période est rejetée par la base.
- **Comportement du moteur** :
  - Pour chaque règle éligible, on traite toutes les périodes de `next_run_date` jusqu’à la date cible (rattrapage : jan, fév, mars en un run si besoin).
  - Pour chaque période : vérification d’une dette existante avec `(source_recurring_rule_id, generated_period_key)`.
  - Si elle n’existe pas → insert, puis `created += 1`. Si elle existe déjà → `alreadyGenerated += 1`.
  - **Dans les deux cas** : avancer `next_run_date` à la prochaine date d’échéance réelle (ex. 28 avril pour mensuel jour 28) et mettre à jour `last_generated_at`. La règle ne reste jamais bloquée.
- **Aucune modification des dettes existantes** : le moteur ne fait que des INSERT.

## 2. Plan d’implémentation

| Étape | Contenu |
|-------|--------|
| Bloc A | Migrations SQL (debts + recurring_rules + contrainte + index), types TS, `src/lib/recurrence/period-key.ts`, service `modules/recurring-rules/service.ts` |
| Bloc B | Queries, actions (CRUD règles + run now), page server `/app/[companyId]/recurring-rules` |
| Bloc C | Composants UI : table, drawer create/edit, badge fréquence, bouton Run now + feedback |

## 3. Migrations SQL (résumé)

- **debts** : ajout de `generated_period_key text`, contrainte unique partielle `(source_recurring_rule_id, generated_period_key)`.
- **recurring_rules** : création de la table avec tous les champs (interval_count, day_of_month nullable, month_of_year nullable, last_generated_at, updated_at, etc.).
- **Vue debts_with_remaining** : ajout de `d.generated_period_key` dans le SELECT.
- **Index** : `recurring_rules(company_id, is_active, next_run_date)`, `debts(source_recurring_rule_id)`, éventuellement `debts(company_id, due_date)` si pas déjà présent.

## 4. Règles métier respectées

- Règles inactives ou après `end_date` : ignorées.
- Dette générée : même `company_id`, `creditor_id`, `debt_category_id`, montant, devise, `due_date` / `incurred_date` dérivés de la période, titre déterministe (ex. "Salaire Ali — 2026-03").
- Seuls les rôles manager (finance_manager, company_admin, group_admin) peuvent créer/éditer des règles et lancer « Run now ».

---

## 5. Sprint 5 Done — Checklist

- [x] Créer une règle récurrente (drawer, validation Zod)
- [x] Modifier une règle récurrente
- [x] Activer / désactiver (is_active) et auto_generate
- [x] Bouton « Run now » (server action, résultat inline)
- [x] Une dette est générée correctement (titre, période, lien source_recurring_rule_id + generated_period_key)
- [x] Relancer Run now ne crée pas de doublon (contrainte unique + skip si existe)
- [x] next_run_date et last_generated_at mis à jour après génération
- [x] Dettes générées visibles dans /debts (même table, même vue)
- [x] Build OK
- [x] Permissions : assertCanManageCompany pour create/update/delete/run
- [x] Module : schema, types, queries, actions, service, composants (table, drawer, filters, badge, run button)
