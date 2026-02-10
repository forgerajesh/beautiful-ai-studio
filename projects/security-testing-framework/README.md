# SECQ - Security Testing Automation Framework

A production-minded starter framework for security testing architecture.

## Highlights
- Config-driven security checks (`config/targets.yaml`)
- Multi-check execution engine with reusable findings model
- Built-in checks:
  - TLS certificate health
  - Security headers
  - Open redirect probe
  - Local secrets scan
- Multi-format reporting:
  - JSON (`reports/security_report.json`)
  - HTML (`reports/security_report.html`)
  - JUnit XML (`reports/security_junit.xml`)
- CI/CD-ready exit codes (non-zero on FAIL/ERROR)

## Quick start
```bash
cd /home/vnc/.openclaw/workspace/projects/security-testing-framework
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/secq.py --config config/targets.yaml
```

## Framework design
```text
framework/
  config_loader.py
  models.py
  engine.py
  checks/
    base.py
    registry.py
    tls_certificate.py
    security_headers.py
    open_redirect.py
    secrets_scan.py
  reporters/
    json_reporter.py
    html_reporter.py
    junit_reporter.py
scripts/
  secq.py
config/
  targets.yaml
reports/
```

## Add new check
1. Implement class extending `SecurityCheck`
2. Register in `framework/checks/registry.py`
3. Add check entry in YAML

## YAML config model
```yaml
targets:
  - id: demo_web
    type: web
    base_url: https://example.com

checks:
  - id: security_headers
    type: security_headers
    severity: high
    enabled: true
    params:
      required_headers:
        - Strict-Transport-Security
```

## CI usage
```bash
python scripts/secq.py --config config/targets.yaml
```
- Passes: exit 0
- Fail/Error: exit 1 (blocks pipeline)

## Best-practice next upgrades
- Add auth-aware scanning (JWT/session)
- Add OWASP API Top-10 checks
- Add dependency/SBOM scanning (pip-audit, trivy, grype)
- Add DAST integration (OWASP ZAP baseline/full scan)
- Add policy engine (severity threshold by environment)
- Add SARIF export for GitHub Security tab

## Advanced security add-ons (implemented)

### 1) OWASP ZAP baseline scan
```bash
./scripts/run_zap_baseline.sh https://example.com
```
Outputs:
- `reports/zap_report.html`
- `reports/zap_report.json`
- `reports/zap_report.md`

### 2) Dependency audit + SBOM
```bash
./scripts/generate_sbom_and_audit.sh
```
Outputs:
- `reports/pip_audit.json`
- `sbom/bom.json`

### 3) SARIF export (for GitHub Security)
```bash
python scripts/export_sarif.py
```
Output:
- `sarif/security_report.sarif`

You can upload SARIF in GitHub using `github/codeql-action/upload-sarif`.

## Full Security Bundle (implemented)

This framework now includes all major classes:
- **SAST**: Semgrep, Bandit
- **DAST**: OWASP ZAP baseline + full scan
- **Vulnerability scanning**: pip-audit, Trivy FS
- **Secrets scanning**: Gitleaks
- **IaC scanning**: Checkov
- **SBOM**: CycloneDX (`sbom/bom.json`)
- **SARIF export**: GitHub Security integration

### Run complete suite
```bash
cd /home/vnc/.openclaw/workspace/projects/security-testing-framework
./scripts/run_full_security_suite.sh https://example.com
```

Generated artifacts:
- `reports/semgrep.json`
- `reports/bandit.json`
- `reports/pip_audit.json`
- `reports/trivy_fs.json`
- `reports/gitleaks.json`
- `reports/checkov.json`
- `reports/zap_report.json`
- `reports/zap_full_report.json`
- `reports/security_bundle_summary.json`
- `reports/security_bundle_summary.html`
- `sarif/security_report.sarif`
- `sbom/bom.json`

### CI behavior
- core SECQ checks run on every PR/push
- full security bundle runs and publishes artifacts
- SARIF is uploaded to GitHub Security tab

## One-command SECQ UX

Run core checks:
```bash
./scripts/secq
```

Run full world-class bundle:
```bash
./scripts/secq --full --target https://example.com
```

Run full + email notify:
```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your_gmail@gmail.com
export SMTP_PASS=your_app_password
export REPORT_FROM=your_gmail@gmail.com
export REPORT_TO=recipient@gmail.com
./scripts/secq --full --target https://example.com --notify
```

Wrapper outputs a JSON summary including status, report paths, and tails of scanner output.
