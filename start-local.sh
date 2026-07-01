#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PG_CONTAINER="vortex-postgres"

cleanup() {
  echo "Shutting down lightshow.lol dev server..."
  kill "$LIGHTSHOW_PID" 2>/dev/null || true
  wait "$LIGHTSHOW_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Start PostgreSQL via Docker
if ! docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
  echo "Starting PostgreSQL container..."
  docker rm -f "$PG_CONTAINER" 2>/dev/null || true
  docker run -d --name "$PG_CONTAINER" -p 5432:5432 \
    -e POSTGRES_PASSWORD=vortex \
    -e POSTGRES_DB=vortexcommunity \
    postgres:14
  echo "Waiting for PostgreSQL to be ready..."
  until docker exec "$PG_CONTAINER" pg_isready -U postgres 2>/dev/null; do
    sleep 1
  done
  echo "PostgreSQL is ready."
else
  echo "PostgreSQL container already running."
fi

echo "Starting lightshow.lol dev server on http://localhost:8000..."
(cd lightshow.lol && python -m http.server) &
LIGHTSHOW_PID=$!
sleep 1

echo "Starting Vortex Community server on http://localhost:3000 (community at /community)..."
npm start
