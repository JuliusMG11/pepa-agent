#!/usr/bin/env bash
# Spustí supabase/seed_recent_two_months.sql přes psql uvnitř Docker kontejneru
# (nemusíš mít psql nainstalovaný v macOS — stačí Docker + běžící `pnpm supabase start`)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="$ROOT/supabase/seed_recent_two_months.sql"

if [[ ! -f "$SQL" ]]; then
  echo "Chybí soubor: $SQL"
  exit 1
fi

if ! command -v docker &>/dev/null; then
  echo "Docker není v PATH. Spusť SQL ručně: Supabase Studio → SQL Editor → vlož obsah seed_recent_two_months.sql"
  exit 1
fi

DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E '^supabase_db_' | head -n1)"
if [[ -z "$DB_CONTAINER" ]]; then
  echo "Nenašel jsem kontejner supabase_db_*. Nejdřív: pnpm supabase start"
  exit 1
fi

echo "Používám kontejner: $DB_CONTAINER"
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres < "$SQL"
echo "Hotovo."
