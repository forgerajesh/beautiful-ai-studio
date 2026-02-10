# TestOps Platform (Product-Style Unified Testing)

A feature-oriented testing product combining:
- Functional testing (Playwright workflows)
- Non-functional testing (SLA + light load checks)
- Security testing (SECQ integration)

Designed like a productized automation layer: one config, one runner, unified report.

## Project structure
```text
app/
  core/            # config + orchestrator + models
  features/
    functional/    # workflow execution integration
    non_functional/# SLA/load checks
    security/      # SECQ integration
  reporting/       # unified HTML/JSON report
  api/             # FastAPI service
config/
  product.yaml     # feature-oriented config
reports/           # outputs
main.py            # CLI runner
```

## Setup
```bash
cd /home/vnc/.openclaw/workspace/projects/testops-platform
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run product suite
```bash
python main.py --config config/product.yaml
```

Outputs:
- `reports/summary.json`
- `reports/summary.html`

## Run API
```bash
uvicorn app.api.server:app --host 0.0.0.0 --port 8090
```

Endpoint:
- `POST /run?config_path=config/product.yaml`

## Notes
- Functional feature reuses the Python agentic framework workflows.
- Security feature reuses SECQ runner.
- Non-functional feature currently includes HTTP SLA and light load checks.

## Next upgrades
- contract testing layer
- distributed load profiles
- flaky test quarantine + trend analytics
- policy gates by environment and risk profile
