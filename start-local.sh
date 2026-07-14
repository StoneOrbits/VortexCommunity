#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PG_CONTAINER="vortex-postgres"
PG_VOLUME="vortex-postgres-data"

cleanup() {
  echo "Shutting down lightshow.lol dev server..."
  kill "$LIGHTSHOW_PID" 2>/dev/null || true
  wait "$LIGHTSHOW_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Start PostgreSQL via Docker
if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  # If the container was stopped (e.g. reboot), just start it back up
  if docker ps -a --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    echo "Starting existing PostgreSQL container..."
    docker start "$PG_CONTAINER"
  else
    echo "Creating PostgreSQL container with persistent volume..."
    docker run -d --name "$PG_CONTAINER" -p 5432:5432 \
      -v "$PG_VOLUME":/var/lib/postgresql/data \
      -e POSTGRES_PASSWORD=vortex \
      -e POSTGRES_DB=vortexcommunity \
      postgres:14
  fi
  echo "Waiting for PostgreSQL to be ready..."
  until docker exec "$PG_CONTAINER" pg_isready -U postgres 2>/dev/null; do
    sleep 1
  done
  echo "PostgreSQL is ready."
else
  echo "PostgreSQL container already running."
fi

echo "Running database migrations..."
bash "$SCRIPT_DIR/scripts/db-migrate.sh"

# Seed from dump if database is empty
DUMP_FILE="$SCRIPT_DIR/vortexcommunity.dump"
if [ -f "$DUMP_FILE" ]; then
  USER_COUNT=$(docker exec "$PG_CONTAINER" psql -U postgres -d vortexcommunity -t -A -c "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
  if [ "$USER_COUNT" = "0" ]; then
    echo "Database is empty — restoring from $DUMP_FILE..."
    cat "$DUMP_FILE" | docker exec -i "$PG_CONTAINER" pg_restore -U postgres -d vortexcommunity --clean --no-owner --no-acl 2>/dev/null || \
    cat "$DUMP_FILE" | docker exec -i "$PG_CONTAINER" psql -U postgres -d vortexcommunity 2>/dev/null || true
    echo "Database restored."
  else
    echo "Database already has data ($USER_COUNT users) — skipping restore."
  fi
else
  echo "No dump file found at $DUMP_FILE — skipping seed."
fi

echo "Starting lightshow.lol dev server on http://localhost:8000..."
(cd lightshow.lol && python -m http.server) &
LIGHTSHOW_PID=$!
sleep 1

echo "Building CSS bundle..."
bash "$SCRIPT_DIR/scripts/bundle_css.sh"

echo "Starting Vortex Community server on http://localhost:3000 (community at /community)..."
npm start
