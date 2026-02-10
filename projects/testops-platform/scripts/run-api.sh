#!/usr/bin/env bash
set -euo pipefail
source .venv/bin/activate
uvicorn app.api.server:app --host 0.0.0.0 --port "${API_PORT:-8090}"
