#!/usr/bin/env bash
set -euo pipefail

EVENT="${1:-qa-builder-alert}"
DETAILS="${2:-no-details}"

WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
if [[ -z "$WEBHOOK_URL" ]]; then
  echo "ALERT_WEBHOOK_URL not set; event=${EVENT} details=${DETAILS}" >&2
  exit 0
fi

payload=$(cat <<JSON
{"event":"${EVENT}","details":"${DETAILS}","at":"$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
JSON
)

curl -fsS -X POST "$WEBHOOK_URL" -H 'Content-Type: application/json' -d "$payload" >/dev/null

echo "alert hook sent: ${EVENT}"
