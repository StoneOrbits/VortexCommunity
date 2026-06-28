#!/bin/bash
# deploy.sh — run ON the server during deploy
set -e

cd /home/vortex/VortexCommunity

source /home/vortex/.nvm/nvm.sh

# Discard any local modifications and pull latest
git checkout -- .
git pull

# Only reinstall if package files changed
if git diff --quiet @{1} @ -- package.json package-lock.json 2>/dev/null && [ -d node_modules ]; then
  echo "Dependencies unchanged, skipping install"
else
  mv node_modules /tmp/old-node-modules-$$ 2>/dev/null || true
  npm install --no-audit --no-fund
fi

chmod +x start.sh
