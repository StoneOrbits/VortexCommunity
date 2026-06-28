#!/bin/bash
# deploy.sh — run ON the server during deploy
set -e

cd /home/vortex/VortexCommunity

source /home/vortex/.nvm/nvm.sh

SERVICE="vortex-community"

# Stop service before deploy
sudo systemctl stop "$SERVICE"

# Track commit before pull
BEFORE_HASH=$(git rev-parse HEAD)

# Reset local state and pull
git checkout -- .
git pull --ff-only

# Track commit after pull
AFTER_HASH=$(git rev-parse HEAD)

# If code changed, re-run deploy from clean state
if [ "$BEFORE_HASH" != "$AFTER_HASH" ]; then
  echo "Git updated ($BEFORE_HASH -> $AFTER_HASH), restarting deploy..."
  exec "$0"
fi

# Install dependencies only if needed
if git diff --quiet HEAD@{1} HEAD -- package.json package-lock.json 2>/dev/null && [ -d node_modules ]; then
  echo "Dependencies unchanged, skipping install"
else
  mv node_modules /tmp/old-node-modules-$$ 2>/dev/null || true
  npm install --no-audit --no-fund
fi

chmod +x start.sh

# Start service after everything is stable
sudo systemctl start "$SERVICE"
