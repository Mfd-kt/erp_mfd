# Guide de prise en main du codebase

Ce document donne une vue transversale pour comprendre rapidement le projet et intervenir proprement.

## 1) Vision globale

- Stack: Next.js App Router + Supabase.
- Domaine: ERP financier multi-societes.
- Organisation: routeur/app (`src/app`), metier (`src/modules`), infra partages (`src/lib`), UI (`src/components`).

## 2) Parcours d'une requete utilisateur

1. Le user arrive sur `/` puis est redirige vers `/app`.
2. `src/middleware.ts` verifie la session Supabase:
   - non connecte + route privee => redirect `/sign-in`
   - connecte + route auth => redirect vers `/app` ou `next`
3. Si connecte, le layout applicatif charge le scope d'acces via `getAccessScope()`.
4. Les pages app consomment ce scope pour filtrer les donnees visibles.

## 3) Controle d'acces (important)

Fichier cle: `src/lib/auth/get-access-scope.ts`

- Le scope d'acces retourne:
  - utilisateur courant
  - role le plus eleve
  - groupe courant
  - liste des societes visibles
- Cas special `group_admin`:
  - membership avec `company_id = null`
  - acces a toutes les societes du groupe
- Cas non-admin groupe:
  - acces limite aux societes explicitement rattachees

## 4) Ecran groupe `/app`

Fichier cle: `src/app/app/page.tsx`

Cette page orchestre la vue consolidee groupe:

- charge dettes, revenus, comptes
- charge execution (tasks, sprints, plan)
- charge assistant (recommandations, conversation active)
- calcule KPI consolides
- construit des payloads "explain" pour rendre les cartes transparentes

## 5) Multi-devise / FX

Fichier cle: `src/modules/group-dashboard/group-fx.ts`

- Les montants societe sont convertis vers la devise groupe.
- Regle taux: dernier taux connu avec date d'effet `<= asOfDate`.
- Si taux manquant:
  - la ligne est marquee "rateMissing"
  - elle n'est pas incluse dans le total consolide

Ce comportement est volontaire pour eviter un faux total.

## 6) Modules metier a connaitre en priorite

- `alerts`: detection de signaux de risque
- `forecast`: previsions et dependances FX
- `analytics`: agregations et indicateurs
- `assistant`: recommandations et routines
- `jobs` / `api/cron`: traitements planifies

## 7) Bonnes pratiques de contribution

- Toujours partir du scope d'acces avant une nouvelle query metier.
- Eviter la logique metier dans les composants UI; la mettre dans `src/modules`.
- Ajouter une note explicative quand une regle n'est pas evidente (auth, FX, consolidation).
- Verifier les cas "donnees absentes" (pas de membership, pas de taux FX, pas de profile).

## 8) Checklist avant merge

- Auth: aucune boucle de redirection.
- Scope: un user ne voit que ses entites autorisees.
- KPI: totaux coherents avec les regles FX.
- Docs: mise a jour si un flux metier change.
