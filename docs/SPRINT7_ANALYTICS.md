# Sprint 7 — Reporting et analytics

Couche de reporting et d’analytics pour la prise de décision financière.

---

## 1. Objectifs

- Comprendre où part l’argent (dépenses par catégorie / créancier)
- Identifier les plus grosses dépenses et les dettes à risque
- Suivre l’évolution de la trésorerie (entrées / sorties / net par mois)
- Comparer les sociétés (page groupe)

---

## 2. Modules et pages

### Routes

- **Société** : `/app/[companyId]/analytics`
- **Groupe** : `/app/analytics`

### Filtres de période

- Mois en cours
- 3 derniers mois
- 6 derniers mois
- Personnalisé (date de début + date de fin)

Tous les analytics réagissent aux paramètres d’URL (`preset`, `from`, `to`).

### Données utilisées

- **Dépenses** = somme des **paiements** (`payments.amount_company_currency`) sur la période (pas le montant total des dettes).
- **En cours** = `debts_with_remaining.remaining_company_currency`.
- **Entrées** = revenus avec `received_date` dans la période, `amount_received`.
- **Âge des dettes** : non échue, à échéance (0–7 j), en retard (8–30 j), en retard 30+ j.

---

## 3. Structure du module

```
src/modules/analytics/
├── types.ts           # Types (KPIs, breakdowns, aging, cash flow)
├── schema.ts          # Filtres (preset, date range)
├── queries.ts         # Requêtes Supabase (payments, debts, revenues)
├── service.ts         # Agrégation côté serveur (société + groupe)
└── components/
    ├── analytics-summary.tsx      # Cartes KPI
    ├── expenses-by-category-chart.tsx  # Camembert (recharts)
    ├── expenses-by-creditor-chart.tsx   # Barres (recharts)
    ├── cash-flow-chart.tsx             # Ligne (recharts)
    ├── debt-aging-table.tsx            # Tableau âge des dettes
    ├── top-risks-table.tsx             # Dettes à risque
    ├── company-comparison-table.tsx    # Comparatif groupe
    └── period-filter.tsx              # Filtre période (preset + custom)
```

---

## 4. Logique métier

- **Dépenses par catégorie** : `payments` sur la période → jointure `debts` → regroupement par `debt_category_id`, noms via `debt_categories`.
- **Dépenses par créancier** : même flux → regroupement par `creditor_id` ; colonnes Payé (somme paiements) et Restant dû (somme `remaining` des dettes).
- **Âge des dettes** : `debts_with_remaining` (hors paid/cancelled), calcul des buckets à partir de `due_date` vs aujourd’hui.
- **Trésorerie par mois** : entrées = `revenues.amount_received` groupé par mois (`received_date`) ; sorties = `payments.amount_company_currency` groupé par mois (`payment_date`).
- **Top risques** : dettes en retard + dettes à échéance sous 7 jours, tri par montant restant décroissant.

---

## 5. Groupe

- Agrégation des analytics par société, puis conversion en devise du groupe (`getExchangeRate`).
- Tableau comparatif par société (dépenses, revenus, dettes en retard) dans la devise de chaque société.
- Graphiques et tableaux d’âge des dettes en devise groupe.

---

## 6. UI

- Mise en page type admin (cards, tableaux, graphiques).
- États vides gérés (aucune dépense, aucun créancier, etc.).
- Tooltips sur les graphiques (recharts).
- Montants formatés en devise (fr-FR).
- Sidebar : lien « Analytics » par société, « Analytics groupe » au niveau groupe.

---

## 7. Performance

- Agrégation côté serveur (service + requêtes ciblées).
- Pas de chargement de toutes les lignes brutes côté client.
- Requêtes par société puis agrégation en mémoire pour le groupe (éventuelle évolution vers des vues SQL / RPC pour de très gros volumes).

---

## 8. Checklist Sprint 7

- [ ] **Filtres** : Mois en cours, 3 mois, 6 mois, personnalisé (from/to) appliqués à toutes les sections.
- [ ] **KPI** : Dépenses, revenus, résultat net, dettes en retard affichés et cohérents avec la période.
- [ ] **Dépenses par catégorie** : Camembert (ou barres), montants corrects, libellés catégories.
- [ ] **Dépenses par créancier** : Barres Payé / Restant, top créanciers.
- [ ] **Âge des dettes** : 4 buckets (non échue, 0–7 j, 8–30 j, 30+ j), effectifs et montants.
- [ ] **Trésorerie par mois** : Courbe entrées / sorties / net, mois avec données.
- [ ] **Top risques** : Dettes en retard + à échéance sous 7 j, lien vers la dette (société).
- [ ] **Page groupe** : Même structure, consolidation en devise groupe, tableau comparatif sociétés.
- [ ] **Navigation** : Liens Analytics (société) et Analytics groupe dans la sidebar.
- [ ] **États vides** : Messages clairs quand aucune donnée sur la période.
