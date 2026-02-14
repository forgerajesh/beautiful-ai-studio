#!/usr/bin/env bash
set -euo pipefail
DB_PATH="${DB_PATH:-./server/qa_builder_v2.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/qa_builder_v2_$STAMP.sqlite"
cp "$DB_PATH" "$OUT"
echo "Backup created: $OUT"
