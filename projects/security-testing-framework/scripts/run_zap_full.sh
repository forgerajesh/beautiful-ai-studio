#!/usr/bin/env bash
set -euo pipefail
TARGET_URL="${1:-https://example.com}"
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

echo "Running OWASP ZAP full scan against: $TARGET_URL"
if ! command -v docker >/dev/null 2>&1; then
  echo '{"warning":"docker not available, zap full skipped", "site": []}' > "$OUT_DIR/zap_full_report.json"
  echo "ZAP full skipped (docker not found)"
  exit 0
fi

docker run --rm -t \
  -v "$(pwd)/$OUT_DIR:/zap/wrk" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py -t "$TARGET_URL" -r zap_full_report.html -J zap_full_report.json -w zap_full_report.md || true

echo "ZAP full outputs: $OUT_DIR/zap_full_report.html, $OUT_DIR/zap_full_report.json, $OUT_DIR/zap_full_report.md"
