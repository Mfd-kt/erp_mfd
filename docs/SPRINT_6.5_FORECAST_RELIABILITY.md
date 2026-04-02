# Sprint 6.5 — Fiabilité financière du forecast

Ce sprint ne vise **pas** à ajouter de fonctionnalités, mais à garantir **exactitude, cohérence et confiance** dans les prévisions de trésorerie.

---

## 1. Garanties financières

### Taux de change (pas de fallback silencieux)

- **Même devise** (`from_currency === to_currency`) → taux = 1.
- **Devises différentes** : le système utilise `getExchangeRateStrict(from, to, date)` :
  - Dernier taux connu avec `effective_from <= date`, trié par `effective_from` décroissant.
  - Si **aucun taux trouvé** : retour `{ rate: null, missing: true }` — **jamais** de valeur 1 par défaut.
- **Prévision groupe** : si une conversion manque pour une société :
  - La prévision est marquée **incomplète** (`incomplete: true`).
  - La liste des paires manquantes est exposée (`missingExchangeRates`, ex. `["USD → EUR"]`).
  - Les montants des sociétés sans taux **ne sont pas** ajoutés aux totaux (pas de total faux).

### Revenus (reliquat uniquement)

- Les **entrées** prévisionnelles ne comptent que le **reliquat attendu** :
  - `remaining_expected = amount_expected - amount_received`
- Règles :
  - `remaining_expected <= 0` → exclu de la prévision.
  - Partiellement reçu → seul le reliquat est inclus.
  - Pas encore reçu → `amount_expected` en entier.
- Calcul **uniquement côté serveur** ; l’UI affiche les montants calculés.

### Récurrent vs dettes réelles (pas de double compte)

- Pour chaque **règle récurrente** et chaque **période** :
  - Calcul de `generated_period_key` (ex. `2026-03`, `2026-Q1`, `2026`).
  - Vérification en base : existe-t-il une dette avec `source_recurring_rule_id = rule.id` et `generated_period_key = période` ?
- **Si une telle dette existe** → on **ne** simule **pas** la sortie récurrente pour cette période.
- **Sinon** → on ajoute la sortie simulée.
- Appliqué dans le service de prévision (requêtes + agrégation).

### Traçabilité

- Chaque période de prévision peut inclure :
  - **inflows_breakdown** : `revenuesRemaining`
  - **outflows_breakdown** : `debts_due`, `recurring_simulated`
  - **currency_conversion_warnings** (p.ex. paires sans taux)
- Prévision groupe : nombre de sociétés incluses, devise de conversion, liste des taux manquants.

### Côté client

- Aucune logique financière de repli ou de calcul dans le client.
- Tous les montants et indicateurs (incomplete, missingRates, breakdowns) sont **calculés côté serveur** ; l’UI se contente de les afficher.

---

## 2. Checklist de validation Sprint 6.5

- [ ] **Taux de change**
  - [ ] Même devise → taux 1, pas d’appel API.
  - [ ] Devises différentes sans taux → `getExchangeRateStrict` retourne `{ rate: null, missing: true }`.
  - [ ] Prévision groupe avec au moins une paire sans taux → `incomplete: true`, `missingExchangeRates` renseigné, totaux sans les sociétés concernées.
  - [ ] Bannière UI « Prévision incomplète : taux de change manquants (…) » affichée quand `incomplete` et `missingExchangeRates` sont présents.

- [ ] **Revenus**
  - [ ] Revenu entièrement reçu → exclu de la prévision (reliquat ≤ 0).
  - [ ] Revenu partiellement reçu → seul le reliquat apparaît dans les entrées.
  - [ ] Revenu non reçu → `amount_expected` entier dans la prévision.
  - [ ] Aucun calcul de reliquat côté client.

- [ ] **Récurrent / dettes**
  - [ ] Pour une règle et une période, si une dette existe avec `source_recurring_rule_id` + `generated_period_key` correspondants → pas de sortie récurrente simulée pour cette période.
  - [ ] Sinon → sortie récurrente simulée incluse dans les outflows.

- [ ] **Traçabilité**
  - [ ] Périodes avec `inflowsBreakdown.revenuesRemaining` et `outflowsBreakdown.debtsDue` / `recurringSimulated` quand pertinent.
  - [ ] Prévision groupe : `companiesIncluded`, `conversionCurrency`, `missingExchangeRates` utilisés et affichés (sous-titre + bannière).

- [ ] **UI**
  - [ ] ForecastSummary : bannière d’avertissement si prévision incomplète (taux manquants).
  - [ ] ForecastTable : badges / infobulles « Sorties récurrentes simulées », « Revenus partiellement reçus » lorsque les données serveur l’indiquent.
  - [ ] Page prévision groupe : nombre de sociétés incluses, taux manquants éventuels, devise de conversion.

- [ ] **Séparation des responsabilités**
  - [ ] Aucune formule financière (taux, reliquat, agrégation) dans les composants client ; tout vient du serveur.

---

## 3. Fichiers modifiés (référence)

| Fichier | Rôle |
|--------|------|
| `src/modules/forecast/queries.ts` | `getExchangeRateStrict(from, to, date)` — pas de défaut à 1 |
| `src/modules/forecast/types.ts` | Breakdowns, avertissements, `incomplete`, `missingExchangeRates`, indicateurs UI |
| `src/modules/forecast/service.ts` | Revenus reliquat, déduplication récurrent/dette, prévision groupe stricte, indicateurs |
| `src/modules/forecast/components/ForecastSummary.tsx` | Bannière prévision incomplète |
| `src/modules/forecast/components/ForecastTable.tsx` | Badges récurrent simulé / revenus partiels |
| `src/app/app/forecast/page.tsx` | Affichage groupe : sociétés, taux manquants, devise |
| `src/app/app/[companyId]/forecast/page.tsx` | Passage des indicateurs à la table |
| `supabase/seed.sql` | `exchange_rates` : colonne `effective_from` (alignée migration) |
