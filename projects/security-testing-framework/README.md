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
