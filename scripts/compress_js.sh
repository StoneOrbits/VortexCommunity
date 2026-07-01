#!/usr/bin/env bash
set -euo pipefail

echo "Compressing JS..."

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

for jsFile in "$REPO_ROOT"/public/js/*.js; do
  base="$(basename "$jsFile")"
  if [[ "$base" == "VortexLib.js" ]] || [[ "$base" == "VortexLib.wasm" ]]; then
    continue
  fi
  echo "  $base"
  npx terser --compress --module -- "$jsFile" > "$jsFile.tmp"
  mv "$jsFile.tmp" "$jsFile"
done

echo "Done compressing JS"
