#!/bin/bash
set -e

MONGO_CONTAINER="vortex-mongo"
PG_CONTAINER="vortex-postgres"
DUMP_ARCHIVE="vortex-dump.tar.gz"
DUMP_DIR="/tmp/vortex-dump"

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

# Apply database migrations
echo "Running database migrations..."
bash scripts/db-migrate.sh

# Start MongoDB via Docker (needed for migration script)
if ! docker ps --format '{{.Names}}' | grep -q "^${MONGO_CONTAINER}$"; then
  echo "Starting MongoDB container..."
  docker rm -f "$MONGO_CONTAINER" 2>/dev/null || true
  docker run -d --name "$MONGO_CONTAINER" -p 27017:27017 mongo:6
  echo "Waiting for MongoDB to be ready..."
  until docker exec "$MONGO_CONTAINER" mongosh --eval "db.runCommand({ ping: 1 })" --quiet 2>/dev/null; do
    sleep 1
  done
  echo "MongoDB is ready."
else
  echo "MongoDB container already running."
fi

# Extract and import the database dump for local testing
if [ -f "$DUMP_ARCHIVE" ]; then
  echo "Importing test database from $DUMP_ARCHIVE..."
  rm -rf "$DUMP_DIR"
  tar xzf "$DUMP_ARCHIVE" -C /
  docker cp "$DUMP_DIR"/vortexcommunity/. "$MONGO_CONTAINER":/tmp/dump/
  docker exec "$MONGO_CONTAINER" mongorestore --drop --db vortexcommunity /tmp/dump/ 2>/dev/null
  echo "MongoDB import complete."

  # Run migration from MongoDB to PostgreSQL
  echo "Running MongoDB to PostgreSQL migration..."
  node scripts/migrate-mongo-to-pg.js
  echo "Migration complete."
fi

echo "Starting Vortex Community server..."
npm start
