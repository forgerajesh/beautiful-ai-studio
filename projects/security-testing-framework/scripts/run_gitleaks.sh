#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

docker run --rm -v "$(pwd):/repo" zricethezav/gitleaks:latest detect \
  --source /repo \
  --report-format json \
  --report-path /repo/$OUT_DIR/gitleaks.json || true

echo "Gitleaks report: $OUT_DIR/gitleaks.json"
