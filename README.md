# ERP MFD

ERP financier multi-societes construit avec Next.js (App Router) et Supabase.

## Demarrage rapide

```bash
npm install
npm run dev
```

Application locale: [http://localhost:3000](http://localhost:3000)

## Flux principal

- `/` redirige vers `/app`.
- `middleware` protege les routes privees et gere la redirection vers `/sign-in`.
- apres connexion, le layout applicatif charge le scope d'acces (groupe, role, societes visibles).
- la page `/app` affiche une vue consolidee groupe (dettes, revenus, alertes, execution).

## Structure utile

- `src/app`: routes Next.js (pages, layouts, API routes)
- `src/modules`: logique metier par domaine (revenues, debts, forecast, alerts, assistant, etc.)
- `src/lib`: acces Supabase, auth, utilitaires partages
- `src/components`: composants UI et layout
- `docs`: documentation fonctionnelle/architecture par sprint
- `tests`: tests automatises

## Documentation recommandee

- `docs/SPRINT12_ARCHITECTURE.md`
- `docs/GLOBAL_DASHBOARD.md`
- `docs/BACKUP_AND_RECOVERY.md`
- `docs/CODEBASE_GUIDE.md` (ajoute dans cette passe)

## Points d'attention techniques

- l'authentification et le perimetre d'acces reposent sur `memberships`.
- certaines aggregations groupe utilisent des conversions FX (`exchange_rates`).
- des taux manquants peuvent produire des totaux consolides partiels (comportement voulu).

## Scripts (npm)

- `npm run dev`: lancement local
- `npm run build`: build production
- `npm run start`: execution production
- `npm run test`: tests
