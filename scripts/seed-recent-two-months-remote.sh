#!/usr/bin/env bash
# Nahraje seed_recent_two_months.sql do VZDÁLENÉ (produkční) Supabase Postgres.
# Vyžaduje connection string z Dashboardu (neanon klíč, ne Next.js URL).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/supabase/seed_recent_two_months.sql"

if [[ ! -f "$SQL" ]]; then
  echo "Chybí: $SQL"
  exit 1
fi

# Načti .env.local pokud existuje (SUPABASE_DB_DIRECT_URL)
if [[ -f "$ROOT/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env.local"
  set +a
fi

if [[ -z "${SUPABASE_DB_DIRECT_URL:-}" ]]; then
  echo "Nastav v .env.local proměnnou:"
  echo "  SUPABASE_DB_DIRECT_URL=postgresql://postgres.[PROJECT-REF]:[HESLO]@aws-0-[region].pooler.supabase.com:6543/postgres"
  echo "nebo přímý port 5432 (viz Supabase → Project Settings → Database → Connection string → URI)."
  echo ""
  echo "Bez CLI: Supabase Dashboard → SQL Editor → vlož obsah souboru:"
  echo "  $SQL"
  exit 1
fi

run_psql() {
  if command -v psql &>/dev/null; then
    psql "$SUPABASE_DB_DIRECT_URL" -v ON_ERROR_STOP=1 -f "$SQL"
    return
  fi
  if command -v docker &>/dev/null; then
    echo "Používám psql z image postgres:16-alpine (Docker)…"
    docker run --rm -i postgres:16-alpine psql "$SUPABASE_DB_DIRECT_URL" -v ON_ERROR_STOP=1 -f - < "$SQL"
    return
  fi
  echo "Potřebuješ buď: brew install libpq, nebo Docker."
  exit 1
}

echo "Spouštím seed proti vzdálené DB…"
run_psql
echo "Hotovo."
