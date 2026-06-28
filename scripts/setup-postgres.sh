#!/bin/bash
# setup-postgres.sh — Install PostgreSQL on Ubuntu 20.04
# Run this once on the live server before the first deployment.
#
# This only installs and configures PostgreSQL.
# Database/user creation and schema migrations are handled separately
# by db-migrate.sh (run on every deploy via GitHub Actions / start.sh).
set -e

REMOTE_IP="172.232.170.43"   # lightshow.lol

echo "=== Installing PostgreSQL ==="
sudo apt update
sudo apt install -y postgresql postgresql-contrib

echo "=== Configuring PostgreSQL ==="
PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file" | xargs)
PG_CONF=$(sudo -u postgres psql -t -c "SHOW config_file" | xargs)

echo "HBA file: $PG_HBA"
echo "Config file: $PG_CONF"

# Listen on all interfaces (required for remote access)
sudo sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = '*'/" "$PG_CONF"

# Allow local socket connections (peer auth — default)
# Allow localhost TCP (md5 auth)
# Allow the remote IP (md5 auth)
sudo tee -a "$PG_HBA" > /dev/null <<EOF

# Allow remote vortexapp connections (added by setup-postgres.sh)
host    vortexcommunity    vortexapp    127.0.0.1/32            md5
host    vortexcommunity    vortexapp    ${REMOTE_IP}/32         md5
EOF

echo "=== Starting PostgreSQL ==="
sudo systemctl start postgresql
sudo systemctl enable postgresql

echo ""
echo "=== PostgreSQL Installation Complete ==="
echo "Installed:  PostgreSQL 14"
echo "Listening:  all interfaces (*)"
echo "Remote IP:  ${REMOTE_IP}"
echo ""
echo "Next steps:"
echo "  1. Add PG_* variables to /home/vortex/VortexCommunity/.env"
echo "  2. Push code to trigger deploy (runs db-migrate.sh which creates DB + user)"
echo "  3. Run 'node scripts/migrate-mongo-to-pg.js' to transfer data from MongoDB"
