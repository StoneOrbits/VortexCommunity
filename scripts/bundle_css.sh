#!/usr/bin/env bash
set -euo pipefail

echo "Bundling CSS..."

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
CSS_DIR="$REPO_ROOT/public/css"
BUNDLE="$CSS_DIR/bundle.min.css"
BUILD_JSON="$REPO_ROOT/public/build.json"

# Order matters for cascade: base → layouts → components → partials → pages
ORDER=(
  "layouts/base.css"
  "layouts/main.css"
  "components/alerts.css"
  "components/buttons.css"
  "components/footer.css"
  "components/forms.css"
  "components/header.css"
  "components/modals.css"
  "components/control-panel.css"
  "partials/nav.css"
  "partials/search.css"
  "partials/lightshow.css"
  "partials/mode-tile.css"
  "partials/mode-tile-preview-lightshow.css"
  "partials/pat-tile.css"
  "partials/pat-tile-submission.css"
  "partials/pat-list-item-submission.css"
  "partials/submission-led-highlight.css"
  "partials/submission-lightshow.css"
  "partials/download-items.css"
  "partials/facebook-login.css"
  "pages/index.css"
  "pages/modes.css"
  "pages/mode.css"
  "pages/pats.css"
  "pages/pat.css"
  "pages/upload.css"
  "pages/upload-submit.css"
  "pages/downloads.css"
  "pages/login.css"
  "pages/profile.css"
  "pages/admin.css"
  "pages/terms.css"
  "pages/error.css"
)

# Concatenate in order
> "$BUNDLE.tmp"
for rel in "${ORDER[@]}"; do
  file="$CSS_DIR/$rel"
  if [ -f "$file" ]; then
    cat "$file" >> "$BUNDLE.tmp"
    echo "" >> "$BUNDLE.tmp"
  else
    echo "  WARNING: missing $rel"
  fi
done

# Minify the bundle
node -e "
  const fs = require('fs');
  const csso = require('csso');
  const css = fs.readFileSync('$BUNDLE.tmp', 'utf8');
  const result = csso.minify(css);
  fs.writeFileSync('$BUNDLE', result.css);
"
rm "$BUNDLE.tmp"

# Generate build hash from bundle content
HASH=$(sha256sum "$BUNDLE" | cut -c1-16)
echo "{\"css\": \"$HASH\"}" > "$BUILD_JSON"

SIZE=$(wc -c < "$BUNDLE")
echo "Done: bundle.min.css ($SIZE bytes, sha256:$HASH)"
