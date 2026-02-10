#!/usr/bin/env bash
set -euo pipefail
mkdir -p reports sbom

python3 -m pip install --quiet pip-audit cyclonedx-bom || true

# Dependency vulnerability scan
pip-audit -r requirements.txt -f json -o reports/pip_audit.json || true

# SBOM (CycloneDX)
cyclonedx-py requirements -i requirements.txt -o sbom/bom.json || true

echo "Generated: reports/pip_audit.json and sbom/bom.json"
