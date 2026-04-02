# Sprint 6 — Forecast & consolidation groupe

## 1. Forecast engine

- **`generateCompanyForecast(supabase, companyId, currency, months)`**  
  Calcule en mémoire, sans persistance :
  - **Ouverture** : mois 1 = somme des soldes (accounts_with_balance), mois suivants = clôture précédente.
  - **Entrées** : revenus avec `expected_date` dans la période et `status != 'cancelled'`.
  - **Sorties** : dettes (debts_with_remaining) avec `due_date` dans la période + **règles récurrentes** qui génèrent un flux dans ce mois (même logique que le moteur récurrent, sans créer de dettes).
  - **Net** = entrées − sorties, **Clôture** = ouverture + net.

- **`generateGroupForecast(supabase, companies, groupId, baseCurrency, months)`**  
  Lance un forecast par société, puis agrège en devise du groupe via la table **exchange_rates** (conversion manquante → rate 1).

## 2. SQL

- **`supabase/migrations/20250317000000_forecast_exchange_rates.sql`**  
  Table `exchange_rates` : `from_currency`, `to_currency`, `rate`, `effective_from`. Indice sur (from_currency, to_currency).

- Aucune table `forecast_periods` : tout est calculé à la volée (pas de données forecast saisies à la main).

## 3. Multi-devises

- Société : tous les montants en devise de la société.
- Groupe : chaque société est convertie en `base_currency` avec `getExchangeRate(from, to)` ; absence de taux → 1.

## 4. Pages

- **`/app/[companyId]/forecast`** : prévision société (table, graphique, résumé).
- **`/app/forecast`** : prévision groupe (même structure, montants consolidés).
- **`/app/exchange-rates`** : liste + formulaire des taux (`exchange_rates`), sans passer par le SQL.

## 5. UI

- **ForecastTable** : colonnes Mois | Ouverture | Entrées | Sorties | Net | Clôture.
- **ForecastChart** : SVG, axe X = mois, axe Y = trésorerie ; deux lignes (ouverture, clôture projetée).
- **ForecastSummary** : cartes « Fin du mois en cours », « Mois prochain », « Fin de période » + alerte si négatif.

## 6. Dashboard

- Cartes **Trésorerie projetée fin du mois** et **Trésorerie projetée mois prochain** (forecast 2 mois).
- Message « Risque de trésorerie négative » si clôture projetée < 0.
- Lien « Voir la prévision complète » vers `/app/[companyId]/forecast`.

## 7. Checklist Sprint 6

- [x] Moteur forecast société (ouverture, entrées, sorties, net, clôture)
- [x] Sorties = dettes échues dans la période + récurrences (sans créer de dettes)
- [x] Forecast groupe = agrégation en base_currency avec exchange_rates
- [x] Page /app/[companyId]/forecast (table + graphique + résumé)
- [x] Page /app/forecast (prévision groupe)
- [x] Graphique ligne (ouverture / clôture)
- [x] Dashboard : trésorerie projetée fin du mois / mois prochain + alerte si négatif
- [x] Aucune donnée forecast stockée manuellement
- [x] Calcul 100 % serveur
