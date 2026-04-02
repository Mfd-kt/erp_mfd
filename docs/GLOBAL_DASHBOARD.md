# Tableau de bord de contrôle global

## Vue d'ensemble

Le tableau de bord global (`/app/global`) consolide les finances professionnelles et personnelles en un seul endroit, tout en gardant la séparation des entités visible.

## Questions répondues

1. **Combien de trésorerie ai-je vraiment ?** → Trésorerie consolidée (soldes des comptes)
2. **Combien dois-je vraiment ?** → Obligations ouvertes (dettes restant à payer)
3. **Où est le risque sur 30/60/90 jours ?** → Tension de trésorerie, point de pression, niveau de risque
4. **Combien puis-je retirer en sécurité ?** → Retrait sécurisé (clôture projetée − tampon)

## Structure

### 1. En-tête hero
- Titre : Contrôle global
- Sous-titre : nombre d'entités, périmètre
- Filtres : période (30/60/90 jours), périmètre (tout/professionnel/personnel)
- Devise de consolidation
- État de fiabilité (Fiable / Taux manquants)

### 2. Bandeau KPI
- Trésorerie consolidée
- Obligations ouvertes
- À recevoir
- Clôture projetée (sur la période)
- Niveau de risque (Faible / Modéré / Élevé / Critique)
- Retrait sécurisé

Chaque carte dispose d’une icône **?** (comme la vue groupe) : popup avec formule, **détail par entité** (montant en devise locale → équivalent en devise du groupe) et **taux** issus de `exchange_rates` (dernier taux avec `rate_date` ≤ date de référence).

### 3. Section tension de trésorerie
- Graphique en barres : trésorerie projetée par mois
- Point de pression le plus fort (mois le plus bas)
- Couleur rouge si négatif, ambre si point bas

### 4. Tableau répartition par entité
- Colonnes : Entité, Type, Trésorerie, Dettes ouvertes, À recevoir, Clôture 30j, Statut
- Liens vers le tableau de bord de chaque entité
- Statut : OK / Vigilance / Critique

### 5. Obligations à échéance
- Principales échéances
- Mise en avant des retards
- Liens directs vers les dettes

### 6. Section retrait sécurisé
- Montant disponible
- Explication du tampon (1 mois de charges récurrentes)
- Formule : Clôture projetée − tampon (0 si négatif)

## Logique métier

- **Trésorerie** : somme des soldes (`accounts_with_balance`, comptes actifs)
- **Obligations** : somme des `remaining_company_currency` des dettes non payées/annulées
- **À recevoir** : `amount_expected - amount_received` pour les revenus non annulés
- **Prévision** : dettes réelles + récurrentes simulées (si pas déjà générées)
- **Tampon de sécurité** : 1 mois de sorties récurrentes fixes (somme des règles actives)
- **Conversion FX** : stricte (`getExchangeRateStrict`), pas de fallback à 1
- **Incomplet** : si un taux manque, le tableau affiche un avertissement

## Fichiers

- `src/modules/global-dashboard/types.ts` — Types
- `src/modules/global-dashboard/service.ts` — Logique de calcul (+ `companyFxRows` pour les popups)
- `src/modules/global-dashboard/build-payloads.ts` — Textes des popups « origine du calcul »
- `src/modules/global-dashboard/schema.ts` — Parsing des paramètres
- `src/modules/global-dashboard/components/` — Filtres, graphique, tableau, obligations, `GlobalDashboardKpiSection`
- `src/app/app/global/page.tsx` — Page
