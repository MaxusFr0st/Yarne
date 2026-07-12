#!/bin/sh
set -eu

API_URL="${VITE_API_URL:-}"
ESCAPED_API_URL=$(printf '%s' "$API_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > /app/dist/config.js <<EOF
window.__YARNE_CONFIG__ = {
  apiUrl: "${ESCAPED_API_URL}"
};
EOF

if [ -n "$API_URL" ]; then
  export VITE_API_URL="$API_URL"
fi

node /app/scripts/generate-serve-headers.mjs

exec serve -s dist -l 8080
