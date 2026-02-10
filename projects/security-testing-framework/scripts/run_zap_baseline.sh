#!/usr/bin/env bash
set -euo pipefail
TARGET_URL="${1:-https://example.com}"
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

echo "Running OWASP ZAP baseline against: $TARGET_URL"
if ! command -v docker >/dev/null 2>&1; then
  echo '{"warning":"docker not available, zap baseline skipped", "site": []}' > "$OUT_DIR/zap_report.json"
  echo "ZAP baseline skipped (docker not found)"
  exit 0
fi

docker run --rm -t \
  -v "$(pwd)/$OUT_DIR:/zap/wrk" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t "$TARGET_URL" -r zap_report.html -J zap_report.json -w zap_report.md || true

echo "ZAP outputs: $OUT_DIR/zap_report.html, $OUT_DIR/zap_report.json, $OUT_DIR/zap_report.md"
