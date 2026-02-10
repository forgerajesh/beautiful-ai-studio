#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

SEVERITY="${TRIVY_SEVERITY:-HIGH,CRITICAL}"

if ! command -v docker >/dev/null 2>&1; then
  echo '{"warning":"docker not available, trivy skipped"}' > "$OUT_DIR/trivy_fs.json"
  echo "Trivy skipped (docker not found)"
  exit 0
fi

docker run --rm -v "$(pwd):/src" aquasec/trivy:latest fs /src \
  --severity "$SEVERITY" \
  --format json \
  --output /src/$OUT_DIR/trivy_fs.json || true

echo "Trivy report: $OUT_DIR/trivy_fs.json"
