#!/bin/bash
# deploy.sh — run ON the server during deploy
set -e

cd /home/vortex/VortexCommunity

source /home/vortex/.nvm/nvm.sh

SERVICE="vortex-community"

IS_RERUN=0
if [ "${1:-}" = "--rerun" ]; then
  IS_RERUN=1
fi

# Only stop service on initial run
if [ "$IS_RERUN" -eq 0 ]; then
  sudo systemctl stop "$SERVICE"
fi

BEFORE_HASH=$(git rev-parse HEAD)

git checkout -- .
git pull --ff-only

AFTER_HASH=$(git rev-parse HEAD)

if [ "$BEFORE_HASH" != "$AFTER_HASH" ]; then
  echo "Git updated ($BEFORE_HASH -> $AFTER_HASH), rerunning deploy..."

  # rerun with flag so we don't stop/start again
  exec "$0" --rerun
fi

if git diff --quiet HEAD@{1} HEAD -- package.json package-lock.json 2>/dev/null && [ -d node_modules ]; then
  echo "Dependencies unchanged, skipping install"
else
  mv node_modules /tmp/old-node-modules-$$ 2>/dev/null || true
  npm install --no-audit --no-fund
fi

chmod +x start.sh

# Only start service once (final run)
if [ "$IS_RERUN" -eq 0 ]; then
  sudo systemctl start "$SERVICE"
fi
