#!/usr/bin/env bash
set -euo pipefail
OUT_DIR="reports"
mkdir -p "$OUT_DIR"

python3 -m pip install --quiet pip-audit || true
pip-audit -r requirements.txt -f json -o "$OUT_DIR/pip_audit.json" || true

echo "pip-audit report: $OUT_DIR/pip_audit.json"
