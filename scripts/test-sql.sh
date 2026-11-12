#!/usr/bin/env bash
# Applies all migrations to a throwaway database and runs the RLS tests.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres scripts/test-sql.sh
set -euo pipefail
cd "$(dirname "$0")/.."
DB="eventos_test_$$"
psql -q -d postgres -c "create database $DB"
trap 'psql -q -d postgres -c "drop database if exists $DB" >/dev/null' EXIT
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/sql/supabase-stub.sql
for f in supabase/migrations/*.sql; do psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f"; done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f tests/sql/rls.sql
