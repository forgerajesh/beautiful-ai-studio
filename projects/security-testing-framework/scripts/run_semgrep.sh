#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo '{"warning":"docker not available, semgrep skipped"}' > "$OUT_DIR/semgrep.json"
  echo "Semgrep skipped (docker not found)"
  exit 0
fi

docker run --rm -v "$(pwd):/src" returntocorp/semgrep semgrep \
  --config "${SEMGREP_CONFIG:-p/security-audit}" \
  --json --output /src/$OUT_DIR/semgrep.json /src || true

echo "Semgrep report: $OUT_DIR/semgrep.json"
