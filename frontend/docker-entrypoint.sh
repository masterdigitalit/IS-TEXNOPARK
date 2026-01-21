#!/bin/sh
set -eu

API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"

escape_value() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

API_BASE_URL_ESCAPED=$(escape_value "$API_BASE_URL")

cat > /usr/share/nginx/html/config.js <<EOF
window.__APP_CONFIG__ = {
  API_BASE_URL: "${API_BASE_URL_ESCAPED}"
};
EOF

exec "$@"
