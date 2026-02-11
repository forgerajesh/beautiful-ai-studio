# OPERATIONS.md — TestOps Platform Runbook

## Project
- Path: `/home/vnc/.openclaw/workspace/projects/testops-platform`
- UI: `http://localhost:5174`
- API: `http://localhost:8090`

---

## 1) Bootstrap
```bash
cd /home/vnc/.openclaw/workspace/projects/testops-platform
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Start services
### API
```bash
uvicorn app.api.server:app --host 0.0.0.0 --port 8090
```

### Worker
```bash
celery -A app.wave1.queue.celery_app.celery_app worker --loglevel=info
```

### React UI
```bash
cd ui-react
npm install
npm run dev
```

### One-command helpers
```bash
make bootstrap
make api
make worker
make ui
make stack
make test
make etl
```

---

## 3) Auth
### API key header
Use one of:
- `admin-token`
- `operator-token`
- `viewer-token`

Example:
```bash
-H "X-API-Key: admin-token"
```

### JWT verify (Wave4.1)
```bash
curl -H "Authorization: Bearer <jwt>" \
  http://localhost:8090/wave4.1/auth/verify
```

---

## 4) Core health/readiness
```bash
curl -H "X-API-Key: viewer-token" http://localhost:8090/health
curl -H "X-API-Key: viewer-token" http://localhost:8090/doctor
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave4.1/auth/status
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave4.1/queue/readiness
curl -X POST -H "X-API-Key: operator-token" http://localhost:8090/wave4.1/queue/startup-verify
```

---

## 5) Main execution flows
### Full suite
```bash
curl -X POST -H "X-API-Key: operator-token" \
  http://localhost:8090/run
```

### Run all agents
```bash
curl -X POST -H "X-API-Key: operator-token" \
  -H "Content-Type: application/json" \
  -d '{}' \
  http://localhost:8090/agent/run
```

### Run one agent
```bash
curl -X POST -H "X-API-Key: operator-token" \
  -H "Content-Type: application/json" \
  -d '{"agent":"security"}' \
  http://localhost:8090/agent/run
```

### Execute workflow
```bash
curl -X POST -H "X-API-Key: operator-token" \
  -H "Content-Type: application/json" \
  -d '{"workflow_path":"../agentic-automation-framework-python/examples/saucedemo-login.json"}' \
  http://localhost:8090/workflows/run
```

---

## 6) ETL operations
```bash
curl -H "X-API-Key: viewer-token" http://localhost:8090/etl/profiles
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"profile":"default"}' \
  http://localhost:8090/etl/run
curl -H "X-API-Key: viewer-token" http://localhost:8090/etl/last-report
```

## 6.1) Mobile testing operations
```bash
curl -H "X-API-Key: viewer-token" http://localhost:8090/mobile/devices
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","device":"iPhone 13","simulate":true}' \
  http://localhost:8090/mobile/run
curl -H "X-API-Key: viewer-token" http://localhost:8090/mobile/last-report
```

---

## 7) Test data management
```bash
curl -H "X-API-Key: viewer-token" http://localhost:8090/testdata/profiles
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"profile":"demo"}' \
  http://localhost:8090/testdata/seed
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"profile":"demo","users":25,"orders":40}' \
  http://localhost:8090/testdata/generate
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"profile":"demo"}' \
  http://localhost:8090/testdata/load
curl -H "X-API-Key: viewer-token" http://localhost:8090/testdata/status
curl -X POST -H "X-API-Key: operator-token" http://localhost:8090/testdata/reset
```

---

## 8) Integrations
### Jira
```bash
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"summary":"Automated issue","description":"Raised by TestOps","issue_type":"Task"}' \
  http://localhost:8090/integrations/jira/create-issue
```

### TestRail
```bash
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"name":"Automated Run"}' \
  http://localhost:8090/integrations/testrail/create-run

curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"run_id":123,"case_id":456,"status_id":1,"comment":"pass"}' \
  http://localhost:8090/wave1/testrail/push-result
```

### Artifacts
```bash
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"product_name":"TestOps Platform"}' \
  http://localhost:8090/artifacts/generate
curl -H "X-API-Key: viewer-token" http://localhost:8090/artifacts/list
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"path":"artifacts/TESTPLAN.md"}' \
  http://localhost:8090/artifacts/read
```

---

## 9) Governance / policy / approvals
```bash
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"counts":{"fail":1,"error":0},"critical_security_failures":0}' \
  http://localhost:8090/wave2/policy/evaluate

curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"title":"Release override","payload":{"release":"1.0.0"},"requested_by":"raj"}' \
  http://localhost:8090/wave2/approval/request

curl -H "X-API-Key: viewer-token" http://localhost:8090/wave2/approval/list
```

---

## 10) Wave3 executive
```bash
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave3/analytics/executive
curl -H "X-API-Key: viewer-token" "http://localhost:8090/wave3/analytics/trends?limit=30"
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave3/remediation/checkpoint/list
```

---

## 11) Wave3.1 hardening
```bash
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"contract_path":"requirements/sample-contract.json"}' \
  http://localhost:8090/wave3.1/contract/validate

curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"requirements_path":"requirements/requirements.json","tests_path":"artifacts/TESTCASES.md"}' \
  http://localhost:8090/wave3.1/traceability/build
```

---

## 12) Wave3.2 advanced quality
```bash
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"test_id":"TC-123","passed":false}' \
  http://localhost:8090/wave3.2/flaky/record
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave3.2/flaky/list

curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"from":"qa","to":"prod","counts":{"fail":0,"error":0}}' \
  http://localhost:8090/wave3.2/promotion/evaluate

curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"name":"home","current_path":"reports/test-snap.bin"}' \
  http://localhost:8090/wave3.2/visual/compare

curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"samples_ms":[10,20,30,40,50,60,70,80,90,100]}' \
  http://localhost:8090/wave3.2/performance/percentiles

curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"scenario":"latency-spike"}' \
  http://localhost:8090/wave3.2/chaos/run
```

---

## 13) Wave4 + Wave4.1
### Wave4
```bash
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"contract_path":"requirements/sample-contract.json","provider_base_url":"https://example.com"}' \
  http://localhost:8090/wave4/contract/execute

curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"baseline_path":"etl/source_orders.csv","current_path":"etl/target_orders.csv"}' \
  http://localhost:8090/wave4/drift/analyze

curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"base_url":"https://example.com"}' \
  http://localhost:8090/wave4/security/fuzz

curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","duration_seconds":30,"interval_ms":500}' \
  http://localhost:8090/wave4/performance/soak
```

### Wave4.1
```bash
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave4.1/auth/status
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"counts":{"fail":0,"error":0},"critical_security_failures":0}' \
  http://localhost:8090/wave4.1/policy/evaluate
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave4.1/queue/readiness

curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"channel":"teams","to":"<teams-webhook-or-target>","message":"Test smoke"}' \
  http://localhost:8090/channels/send
```

---

## 14) Wave5 enterprise operations
```bash
# Mobile cloud run (auto simulate fallback when creds are missing)
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"provider":"browserstack","device":"iPhone 13"}' \
  http://localhost:8090/wave5/mobile/cloud-run

curl -H "X-API-Key: viewer-token" http://localhost:8090/wave5/secrets/status

curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"label":"manual-dr"}' \
  http://localhost:8090/wave5/backup/run
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave5/backup/list

# Alert routing tests
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"channel":"webhook","webhook_url":"https://example.com/hook"}' \
  http://localhost:8090/wave5/alerts/test

curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"channel":"webhook","payload":{"summary":"manual critical","severity":"critical","webhook_url":"https://example.com/hook"}}' \
  http://localhost:8090/wave5/alerts/send

# Native channel smoke sends
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"channel":"whatsapp","chat_id":"15550001111","text":"wave5 smoke"}' \
  http://localhost:8090/channels/send
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"channel":"signal","chat_id":"+15550001111","text":"wave5 smoke"}' \
  http://localhost:8090/channels/send

# DR scripts
scripts/wave5_backup.sh nightly
scripts/wave5_restore.sh backups/<archive>.tar.gz
```

---

## 15) Deployment
### Compose (default)
```bash
docker compose up --build
```

### Wave4.1 compose profile
```bash
docker compose -f deploy/docker-compose.wave41.yml up --build
```

---

## 16) Validation checklist (release smoke)
1. `/health` returns `ok=true`
2. `/doctor` shows all critical checks green for your env
3. `POST /run` executes full suite
4. `/wave3/analytics/executive` returns KPIs
5. ETL run/report endpoints return valid output
6. At least one channel smoke send succeeds
7. `pytest -q` passes

---

## 17) Notes
- Keep secrets in `.env` only (never commit real tokens).
- For enterprise deployment, prefer OIDC mode + OPA URL + Redis-backed workers.
- Use the React UI for day-to-day operations; use this runbook for automation and CI hooks.

---

## 18) Wave6 final enterprise hardening
```bash
# Compliance controls coverage
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"features":{"rbac":true,"jwt_auth":true,"audit_log":true,"alerts":true}}' \
  http://localhost:8090/wave6/compliance/controls

curl -H "X-API-Key: viewer-token" http://localhost:8090/wave6/compliance/audit-retention

curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{"sample":{"email":"ceo@example.com","ssn":"123-45-6789"}}' \
  http://localhost:8090/wave6/compliance/pii-mask/validate

# SSO readiness + SCIM skeleton provisioning
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave6/sso/status
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"user":{"id":"u-100","userName":"u100@test.local","active":true},"actor":"ops"}' \
  http://localhost:8090/wave6/scim/users
curl -X PUT -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"updates":{"displayName":"Ops User"},"actor":"ops"}' \
  http://localhost:8090/wave6/scim/users/u-100
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"actor":"ops"}' \
  http://localhost:8090/wave6/scim/users/u-100/deactivate

# HA/DR drill + report
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"label":"manual-drill"}' \
  http://localhost:8090/wave6/ha-dr/drill/run
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave6/ha-dr/drill/latest

# Cost governance
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"scope":"agent:playwright","daily_limit":100,"warning_threshold":0.8}' \
  http://localhost:8090/wave6/cost/policies
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"scope":"agent:playwright","amount":85,"meta":{"source":"manual"}}' \
  http://localhost:8090/wave6/cost/usage/track
curl -H "X-API-Key: viewer-token" http://localhost:8090/wave6/cost/throttle/agent:playwright
```

---

## QA Lifecycle (UI-driven end-to-end)

Persistence:
- `reports/requirements-store.json`
- `reports/qa-lifecycle-runs.json`

API commands:
```bash
# 1) Add/list/update requirements
curl -H "X-API-Key: viewer-token" http://localhost:8090/qa-lifecycle/requirements
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"title":"Checkout under 2s","domain":"functional","risk":"high"}' \
  http://localhost:8090/qa-lifecycle/requirements
curl -X PUT -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"status":"approved"}' \
  http://localhost:8090/qa-lifecycle/requirements/REQ-XXXXX

# 2..7) Generate strategy/design/cases/plan/types + execute
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{}' http://localhost:8090/qa-lifecycle/strategy
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{}' http://localhost:8090/qa-lifecycle/design
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{}' http://localhost:8090/qa-lifecycle/test-cases
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{}' http://localhost:8090/qa-lifecycle/test-plan
curl -X POST -H "X-API-Key: viewer-token" -H "Content-Type: application/json" \
  -d '{}' http://localhost:8090/qa-lifecycle/testing-types
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"suites":["functional","api","security"]}' http://localhost:8090/qa-lifecycle/execute

# 8) Save + reload runs
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"requirements":[],"strategy":{},"design":{},"test_cases":{},"plan":{},"types_mapping":{},"execution":{}}' \
  http://localhost:8090/qa-lifecycle/runs
curl -H "X-API-Key: viewer-token" http://localhost:8090/qa-lifecycle/runs
```

Optional pushes from review screen:
```bash
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"summary":"QA Lifecycle review"}' http://localhost:8090/qa-lifecycle/push/jira
curl -X POST -H "X-API-Key: operator-token" -H "Content-Type: application/json" \
  -d '{"name":"QA Lifecycle Run"}' http://localhost:8090/qa-lifecycle/push/testrail
```
