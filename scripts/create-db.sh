#!/bin/bash
# create-db.sh — Ensure PostgreSQL database exists, then apply pending migrations
#
# Bootstrap: creates database + user if they don't exist (uses sudo -u postgres
# on the live server for Unix socket peer auth; falls back to docker exec).
# Then applies any .sql files in ../migrations/ not yet recorded in
# schema_migrations.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATIONS_DIR="$PROJECT_DIR/migrations"
LOG_FILE="$PROJECT_DIR/migration-$(date +%Y%m%d-%H%M%S).log"

# Load .env if present
if [ -f "$PROJECT_DIR/.env" ]; then
  source "$PROJECT_DIR/.env"
fi

PG_HOST="${PG_HOST:-127.0.0.1}"
PG_PORT="${PG_PORT:-5432}"
PG_DATABASE="${PG_DATABASE:-vortexcommunity}"
PG_USER="${PG_USER:-postgres}"
PG_PASSWORD="${PG_PASSWORD:-vortex}"

# Tee all output to both terminal and log file
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Database Migration ==="
echo "Host: $PG_HOST:$PG_PORT"
echo "Database: $PG_DATABASE"
echo "Log: $LOG_FILE"

# ---- Bootstrap: ensure database + user exist ----
echo "  [BOOTSTRAP] checking database and user..."

# Helper: try to create user/db, ignore "already exists" errors
bootstrap_pg() {
  local cmd="$1"
  shift
  echo "  [BOOTSTRAP] $cmd"
  echo "$cmd" | "$@" 2>&1 || true
}

# Try sudo-based bootstrap (server with postgres system user)
if command -v sudo &>/dev/null; then
  if sudo -u postgres psql -c "SELECT 1" &>/dev/null; then
    run_pg() { sudo -u postgres psql -t -A; }
    bootstrap_pg "ALTER USER \"$PG_USER\" WITH PASSWORD '$PG_PASSWORD';" run_pg
    bootstrap_pg "CREATE USER \"$PG_USER\" WITH PASSWORD '$PG_PASSWORD';" run_pg
    bootstrap_pg "CREATE DATABASE \"$PG_DATABASE\" OWNER \"$PG_USER\";" run_pg
    bootstrap_pg "GRANT ALL PRIVILEGES ON DATABASE \"$PG_DATABASE\" TO \"$PG_USER\";" run_pg
  else
    echo "  [BOOTSTRAP] sudo available but cannot connect to postgres — skipping"
  fi
fi

# Fall back to Docker (local dev)
if ! command -v sudo &>/dev/null || ! sudo -u postgres psql -c "SELECT 1" &>/dev/null; then
  if command -v docker &>/dev/null && docker ps --format '{{.Names}}' 2>/dev/null | grep -q vortex-postgres; then
    run_pg() { docker exec -i vortex-postgres psql -U postgres -t -A; }
    bootstrap_pg "ALTER USER \"$PG_USER\" WITH PASSWORD '$PG_PASSWORD';" run_pg
    bootstrap_pg "CREATE USER \"$PG_USER\" WITH PASSWORD '$PG_PASSWORD';" run_pg
    bootstrap_pg "CREATE DATABASE \"$PG_DATABASE\" OWNER \"$PG_USER\";" run_pg
    bootstrap_pg "GRANT ALL PRIVILEGES ON DATABASE \"$PG_DATABASE\" TO \"$PG_USER\";" run_pg
  fi
fi

echo "  [BOOTSTRAP] done"

# ---- Connect to the app database ----
export PGPASSWORD="$PG_PASSWORD"

if command -v psql &>/dev/null; then
  run_psql() {
    psql -h "$PG_HOST" -p "$PG_PORT" -d "$PG_DATABASE" -U "$PG_USER" -t -A "$@"
  }
elif command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -q vortex-postgres; then
  run_psql() {
    docker exec -i vortex-postgres psql -U "$PG_USER" -d "$PG_DATABASE" -t -A "$@"
  }
else
  echo "ERROR: No psql client found and no Docker PostgreSQL container running."
  exit 1
fi

# Ensure schema_migrations tracking table exists
echo 'CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());' | run_psql

# Get list of already-applied migrations
APPLIED=$(echo 'SELECT version FROM schema_migrations ORDER BY version;' | run_psql || echo "")

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "No migrations directory found at $MIGRATIONS_DIR"
  exit 0
fi

count=0
for migration_file in $(ls "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort); do
  filename=$(basename "$migration_file")
  version="${filename%.sql}"

  if echo "$APPLIED" | grep -qx "$version"; then
    echo "  [SKIP] $version (already applied)"
    continue
  fi

  echo "  [APPLY] $version..."
  if cat "$migration_file" | run_psql -1 2>&1; then
    echo "INSERT INTO schema_migrations (version) VALUES ('$version');" | run_psql 2>/dev/null
    echo "  [DONE]  $version"
    count=$((count + 1))
  else
    echo "  [FAIL]  $version — migration failed!"
    exit 1
  fi
done

if [ "$count" -eq 0 ]; then
  echo "No new migrations to apply."
else
  echo "Applied $count migration(s)."
fi
