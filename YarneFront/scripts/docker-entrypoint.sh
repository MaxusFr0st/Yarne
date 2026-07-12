#!/bin/sh
set -eu

API_URL="${VITE_API_URL:-}"

if [ -n "$API_URL" ]; then
  ESCAPED_API_URL=$(printf '%s' "$API_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')
  cat > /app/dist/config.js <<EOF
window.__YARNE_CONFIG__ = {
  apiUrl: "${ESCAPED_API_URL}"
};
EOF
  export VITE_API_URL="$API_URL"
  node /app/scripts/generate-serve-headers.mjs
fi

exec serve -s dist -l 8080
