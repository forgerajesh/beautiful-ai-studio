#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/vnc/.openclaw/workspace/projects/beautiful-ai-studio"
cd "$APP_DIR"

# Start backend
if pgrep -f "node server/index.js" >/dev/null; then
  echo "Backend already running"
else
  nohup npm run server > /tmp/beautiful-ai-server.log 2>&1 &
  echo "Backend started"
fi

# Start frontend preview
if pgrep -f "vite preview --host 0.0.0.0 --port 4173" >/dev/null; then
  echo "Frontend already running"
else
  nohup npm run preview -- --host 0.0.0.0 --port 4173 > /tmp/beautiful-ai-preview.log 2>&1 &
  echo "Frontend started"
fi

echo "Done. Frontend: http://127.0.0.1:4173 | API: http://127.0.0.1:8787/api/health"
