#!/usr/bin/env bash
set -euo pipefail

echo "Compressing CSS..."

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"

find "$REPO_ROOT/public/css" -name '*.css' -type f | while read -r cssFile; do
  rel="${cssFile#$REPO_ROOT/public/css/}"
  echo "  $rel"
  node -e "
    const fs = require('fs');
    const csso = require('csso');
    const css = fs.readFileSync('$cssFile', 'utf8');
    const result = csso.minify(css);
    fs.writeFileSync('$cssFile.tmp', result.css);
  "
  mv "$cssFile.tmp" "$cssFile"
done

echo "Done compressing CSS"
