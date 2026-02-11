#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LABEL="${1:-wave5-manual}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="backups"
ARCHIVE="$OUT_DIR/${LABEL}-${STAMP}.tar.gz"

mkdir -p "$OUT_DIR"

tar -czf "$ARCHIVE" reports testdata config app/v31/governance 2>/dev/null || true

echo "created=$ARCHIVE"
