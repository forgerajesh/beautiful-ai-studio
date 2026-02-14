#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8101}"

echo "[healthcheck] checking ${BASE_URL}/api/v2/health"
curl -fsS "${BASE_URL}/api/v2/health" >/dev/null

echo "[healthcheck] checking deep health"
deep_payload="$(curl -fsS "${BASE_URL}/api/v2/health/deep")"
echo "$deep_payload" | grep -q '"status":"ok"'

echo "[healthcheck] OK"
