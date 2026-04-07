#!/usr/bin/env bash
# Applique toutes les migrations SQL dans l’ordre (terminal, sans supabase link).
# Prérequis : psql (brew install libpq) et DATABASE_URL.
#
# 1) Supabase Dashboard → Project Settings → Database
# 2) URI : postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-...pooler.supabase.com:6543/postgres
#    ou connexion directe port 5432 selon l’onglet.
# 3) export DATABASE_URL='postgresql://...'
# 4) Depuis la racine du repo : ./supabase/scripts/run-migrations.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATIONS="$ROOT/migrations"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql introuvable. Installe-le : brew install libpq && brew link --force libpq"
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Définis la connexion Postgres, par exemple :"
  echo "  export DATABASE_URL='postgresql://postgres.xxx:TON_MOT_DE_PASSE@...:6543/postgres'"
  echo "Copie l’URI depuis Supabase → Settings → Database (mot de passe = celui défini pour la base)."
  exit 1
fi

echo "Dossier migrations : $MIGRATIONS"
count=0
# shellcheck disable=SC2012
for f in $(ls -1 "$MIGRATIONS"/*.sql 2>/dev/null | LC_ALL=C sort); do
  count=$((count + 1))
  echo ""
  echo ">>> [$count] $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo ""
echo ">>> NOTIFY PostgREST (rechargement cache schéma)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "NOTIFY pgrst, 'reload schema';"

echo ""
echo "Terminé ($count fichier(s)). Mets à jour .env.local avec l’URL + anon key de CE projet, puis redémarre npm run dev."
