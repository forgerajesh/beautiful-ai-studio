#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo '{"warning":"docker not available, checkov skipped"}' > "$OUT_DIR/checkov.json"
  echo "Checkov skipped (docker not found)"
  exit 0
fi

docker run --rm -v "$(pwd):/tf" bridgecrew/checkov:latest \
  -d /tf \
  -o json > "$OUT_DIR/checkov.json" || true

echo "Checkov report: $OUT_DIR/checkov.json"
