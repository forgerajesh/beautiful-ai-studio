#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt
HOST=${HOST:-0.0.0.0}
PORT=${PORT:-8090}
uvicorn app.main:app --host "$HOST" --port "$PORT"
