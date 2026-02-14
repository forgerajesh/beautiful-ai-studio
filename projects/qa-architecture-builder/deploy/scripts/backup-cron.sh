#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

./deploy/scripts/backup.sh

# Keep most recent 14 backups
ls -1t backups/*.sqlite 2>/dev/null | tail -n +15 | xargs -r rm -f
