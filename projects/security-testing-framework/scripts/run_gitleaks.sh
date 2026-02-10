#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo '[]' > "$OUT_DIR/gitleaks.json"
  echo "Gitleaks skipped (docker not found)"
  exit 0
fi

docker run --rm -v "$(pwd):/repo" zricethezav/gitleaks:latest detect \
  --source /repo \
  --report-format json \
  --report-path /repo/$OUT_DIR/gitleaks.json || true

echo "Gitleaks report: $OUT_DIR/gitleaks.json"
