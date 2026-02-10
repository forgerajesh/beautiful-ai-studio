#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

TARGETS=${*:-"framework scripts"}
python3 -m pip install --quiet bandit || true
bandit -r $TARGETS -f json -o "$OUT_DIR/bandit.json" || true

echo "Bandit report: $OUT_DIR/bandit.json"
