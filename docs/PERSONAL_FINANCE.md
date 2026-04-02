# Gestion des finances personnelles

## Vue d'ensemble

Les finances personnelles sont gérées comme une **entité de type société** (`type: 'personal'`). Aucune logique métier spécifique n'est requise : dettes, revenus, comptes, prévisions, analytics, alertes et automations fonctionnent de la même manière.

## 1. Migration base de données

**Fichier :** `supabase/migrations/20250319000000_companies_type_personal.sql`

- Ajout de la colonne `type` à `companies` : `'business' | 'personal'`
- Valeur par défaut : `'business'` (rétrocompatibilité)
- Index sur `type` pour les requêtes filtrées

**Exécution :** Appliquer la migration via Supabase (Dashboard > SQL Editor ou CLI).

## 2. Types mis à jour

**Fichier :** `src/lib/supabase/types.ts`

- Nouveau type : `CompanyType = 'business' | 'personal'`
- Interface `Company` : ajout de `type: CompanyType`

## 3. Ajustements UI

### Sélecteur de société (Sidebar)

- **Sections séparées :** « Professionnel » et « Personnel »
- **Badge :** Les sociétés personnelles affichent un badge « Personnel »
- Les sociétés sont triées par type dans le menu déroulant

### Page Sociétés

- Nouvelle colonne « Type » avec badge « Personnel » ou libellé « Professionnel »
- Formulaire création/édition : champ « Type » (Professionnel / Personnel)

## 4. Données de seed

**Société personnelle :** MFD Personal (`type: personal`)

- **Types de dette :** Loyer, Abonnements, Crédit, Divers
- **Catégories :** Loyer appartement, Abonnements, Crédit immobilier, Divers
- **Créanciers :** Propriétaire, Banque crédit, Orange, EDF, Netflix
- **Comptes :** Compte courant perso, Livret A
- **Exemples :** Dettes (loyer, mensualité crédit, Netflix), Revenus (salaire, allocation CAF)

## 5. Compatibilité des modules

| Module | Compatible | Notes |
|--------|------------|-------|
| Dettes | ✅ | `company_id` isole les données |
| Revenus | ✅ | Idem |
| Comptes | ✅ | Idem |
| Prévision | ✅ | Même moteur, par société |
| Analytique | ✅ | Même agrégation |
| Alertes | ✅ | Même logique de détection |
| Automations | ✅ | Même moteur de règles |
| Webhooks | ✅ | Même dispatch |

**Isolation des données :** Toutes les tables (debts, revenues, accounts, creditors, debt_categories, etc.) utilisent `company_id`. Aucun mélange possible entre sociétés.

## 6. Validation

- **Pas de mélange :** Chaque requête filtre par `company_id`. Les données personnelles ne sont jamais exposées aux sociétés professionnelles et inversement.
- **Règles identiques :** Priorités, statuts, échéances, prévisions — aucune exception pour le type `personal`.
- **Prévisions groupe :** Les sociétés personnelles sont incluses dans la consolidation groupe si elles appartiennent au même groupe. Le group_admin voit l’ensemble (pro + perso).

## 7. Utilisation

1. Exécuter la migration
2. Réexécuter le seed (ou insérer manuellement une société `type: 'personal'`)
3. Créer une société personnelle via Paramètres > Sociétés > Nouvelle société > Type : Personnel
4. Utiliser les modules (Dettes, Revenus, Comptes, etc.) comme pour une société professionnelle
