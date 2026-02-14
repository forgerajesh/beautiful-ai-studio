#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-file> [target-db-path]"
  exit 1
fi
SRC="$1"
TARGET="${2:-./server/qa_builder_v2.db}"
cp "$SRC" "$TARGET"
echo "Restored $SRC -> $TARGET"
