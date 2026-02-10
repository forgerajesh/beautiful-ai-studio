#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

docker run --rm -v "$(pwd):/src" returntocorp/semgrep semgrep \
  --config "${SEMGREP_CONFIG:-p/security-audit}" \
  --json --output /src/$OUT_DIR/semgrep.json /src || true

echo "Semgrep report: $OUT_DIR/semgrep.json"
