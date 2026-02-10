#!/usr/bin/env bash
set -euo pipefail
cd ui-react
npm run dev -- --host 0.0.0.0 --port "${UI_PORT:-5174}"
