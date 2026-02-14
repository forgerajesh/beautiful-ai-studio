#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "[v2] Installing dependencies..."
  npm install
fi

echo "[v2] Starting QA Architecture Builder v2 on http://localhost:8101"
npm run dev
