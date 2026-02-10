#!/usr/bin/env bash
set -euo pipefail
source .venv/bin/activate
celery -A app.wave1.queue.celery_app.celery_app worker --loglevel=info
