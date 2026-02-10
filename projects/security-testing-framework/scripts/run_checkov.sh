#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

docker run --rm -v "$(pwd):/tf" bridgecrew/checkov:latest \
  -d /tf \
  -o json > "$OUT_DIR/checkov.json" || true

echo "Checkov report: $OUT_DIR/checkov.json"
