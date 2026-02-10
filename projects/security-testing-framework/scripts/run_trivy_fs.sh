#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

SEVERITY="${TRIVY_SEVERITY:-HIGH,CRITICAL}"

docker run --rm -v "$(pwd):/src" aquasec/trivy:latest fs /src \
  --severity "$SEVERITY" \
  --format json \
  --output /src/$OUT_DIR/trivy_fs.json || true

echo "Trivy report: $OUT_DIR/trivy_fs.json"
