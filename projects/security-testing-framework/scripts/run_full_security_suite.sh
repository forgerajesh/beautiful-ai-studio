#!/usr/bin/env bash
set -euo pipefail
TARGET_URL="${1:-https://example.com}"

echo "[1/8] SAST - Semgrep"
./scripts/run_semgrep.sh

echo "[2/8] SAST - Bandit"
./scripts/run_bandit.sh framework scripts

echo "[3/8] VULN - pip-audit"
./scripts/run_pip_audit.sh

echo "[4/8] VULN - Trivy FS"
./scripts/run_trivy_fs.sh

echo "[5/8] Secrets - Gitleaks"
./scripts/run_gitleaks.sh

echo "[6/8] IaC - Checkov"
./scripts/run_checkov.sh

echo "[7/8] DAST - ZAP baseline"
./scripts/run_zap_baseline.sh "$TARGET_URL"

echo "[8/8] DAST - ZAP full"
./scripts/run_zap_full.sh "$TARGET_URL"

echo "[9/9] Aggregate reports"
python3 scripts/aggregate_security_reports.py

STATUS=$(python3 - <<'PY'
import json
from pathlib import Path
p=Path('reports/security_bundle_summary.json')
if not p.exists():
    print('FAIL')
else:
    d=json.loads(p.read_text())
    print(d.get('status','FAIL'))
PY
)

echo "Security bundle status: $STATUS"
if [[ "$STATUS" == "PASS" ]]; then
  exit 0
fi
exit 1
