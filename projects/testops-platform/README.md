# TestOps Platform (Product-Style Unified Testing)

A feature-oriented testing product combining:
- Functional testing (Playwright workflows)
- Non-functional testing (SLA + light load checks)
- Security testing (SECQ integration)
- Mobile testing (device profiles + responsive/touch smoke)
- ETL testing (profile-driven validation)
- OpenClaw-style agent interaction layer across channels
- Self-healing execution (including AI locator repair) and best-practice quality governance

Designed like a productized automation layer: one config, one runner, unified report, channel-driven commands, and a web UI.

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
make bootstrap
```

Or manually:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ui-react && npm install
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
make api
```

## Run worker
```bash
make worker
```

## Run full local stack (Docker)
```bash
make stack
```

## React UI (new)
```bash
cd ui-react
npm install
npm run dev
```
Open `http://localhost:5174`

This React control center integrates:
- channels discovery
- tools/agents execution
- Playwright workflow listing + run
- agent command messaging
- RBAC API key auth controls
- real-time logs via WebSocket
- multi-tenant channel configuration UI

## RBAC
Send header `X-API-Key`:
- `admin-token` (full access)
- `operator-token` (run + update)
- `viewer-token` (read + message)

## Realtime logs
- WebSocket endpoint: `ws://localhost:8090/ws/logs`

## Multi-tenant channels
- `GET /tenants`
- `GET /tenants/{tenant_id}/channels`
- `PUT /tenants/{tenant_id}/channels`

## World-Class v2 endpoints
- `POST /worldclass/plan` → goal-to-agent strategy
- `POST /worldclass/run-goal` → execute planned agents + release decision
- `GET /worldclass/maturity` → maturity score/tier

## Enterprise-grade v3 endpoints
- `POST /v3/distributed/run` → distributed multi-agent execution (threaded workers)
- `GET /v3/telemetry` → runtime metrics snapshot
- `POST /v3/remediation/propose` → governed remediation proposals
- `POST /v3/remediation/apply` → approval-gated remediation apply

## Enterprise-grade v3.1 hardening
- `GET /v3.1/queue/status` → queue backend readiness (Redis-ready hook)
- `GET /v3.1/metrics` → Prometheus text metrics exporter
- `POST /v3.1/remediation/apply` → approval-gated remediation + persistent audit event
- `GET /v3.1/audit` → approval audit trail

Artifacts:
- benchmark history: `reports/v3-benchmarks.json`
- approval audit: `reports/v31-approval-audit.json`

## Jira + TestRail + QA artifacts
Endpoints:
- `POST /integrations/jira/create-issue`
- `POST /integrations/testrail/create-run`
- `POST /artifacts/generate` (generates testcases/testplan/teststrategy)

Environment variables:
- Jira: `JIRA_BASE_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`
- TestRail: `TESTRAIL_BASE_URL`, `TESTRAIL_USER_EMAIL`, `TESTRAIL_API_KEY`, `TESTRAIL_PROJECT_ID`, `TESTRAIL_SUITE_ID` (optional)

Generated files:
- `artifacts/TESTCASES.md`
- `artifacts/TESTPLAN.md`
- `artifacts/TESTSTRATEGY.md`

## Wave1 (advanced implementation)
- Celery + Redis queue hooks for distributed worker execution
- JWT verify endpoint (HS256) for OIDC/JWT migration path
- OTEL readiness endpoint
- TestRail result push endpoint

Wave1 endpoints:
- `GET /wave1/auth/jwt/verify` (Authorization: Bearer <jwt>)
- `GET /wave1/otel/status`
- `POST /wave1/queue/run-agent`
- `POST /wave1/queue/run-all`
- `GET /wave1/queue/task/{task_id}`
- `POST /wave1/testrail/push-result`

Deploy starter:
- `deploy/docker-compose.wave1.yml`

## Wave2 (advanced implementation)
- Policy-as-code gate evaluator (ALLOW/DENY)
- Jira bi-directional sync primitives (comment + transition)
- Risk-based agent selection from changed files
- Two-approver workflow engine for governance

Wave2 endpoints:
- `POST /wave2/policy/evaluate`
- `POST /wave2/risk/select-agents`
- `POST /wave2/jira/add-comment`
- `POST /wave2/jira/transition`
- `POST /wave2/approval/request`
- `POST /wave2/approval/approve`
- `GET /wave2/approval/list`

## Wave3 (advanced implementation)
- AI PR-diff test synthesis (fallback-safe)
- Autonomous remediation checkpoints with HITL approvals
- Executive analytics summary generation

Wave3 endpoints:
- `POST /wave3/synthesis/pr-diff`
- `POST /wave3/remediation/checkpoint/create`
- `POST /wave3/remediation/checkpoint/approve`
- `GET /wave3/remediation/checkpoint/list`
- `GET /wave3/analytics/executive`

Wave3 artifacts:
- `reports/wave3-hitl.json`
- `reports/analytics/executive-summary.json`

## Wave3.1 testing hardening
- Contract schema validator endpoint
- Requirements-to-tests traceability matrix builder

Wave3.1 endpoints:
- `POST /wave3.1/contract/validate`
- `POST /wave3.1/traceability/build`

Wave3.1 files:
- `requirements/sample-contract.json`
- `requirements/requirements.json`
- `reports/traceability-matrix.json`

## Wave3.2 advanced quality modules
- Flaky governance + quarantine registry
- Environment promotion gate evaluator
- Visual regression baseline/compare
- Performance percentile calculator (P50/P95/P99)
- Chaos simulation scenarios

Wave3.2 endpoints:
- `POST /wave3.2/flaky/record`
- `GET /wave3.2/flaky/list`
- `POST /wave3.2/promotion/evaluate`
- `POST /wave3.2/visual/compare`
- `POST /wave3.2/performance/percentiles`
- `POST /wave3.2/chaos/run`

Endpoints:
- `GET /health`
- `GET /` (web UI dashboard)
- `POST /ui/run` (run suite from UI)
- `GET /channels`
- `POST /run?config_path=config/product.yaml`
- `POST /agent/run`
- `POST /agent/message` (agent command entry)
- `POST /webhook/{channel}` (generic webhook ingress for 10+ channels)

Example:
```bash
curl -X POST http://localhost:8090/agent/message \
  -H 'Content-Type: application/json' \
  -d '{"channel":"telegram","user_id":"u1","chat_id":"c1","text":"/run"}'
```

## Agent commands (channel messages)
- `/help`
- `/run`
- `/status`
- `/agents`
- `/run-agent <name>`
- `/run-all-agents`
- `/dashboard`
- `/channels`
- `/ask <goal>`

## Built-in testing agents
- `playwright` (functional UI workflows)
- `api` (endpoint health/smoke)
- `non_functional` (SLA/load checks)
- `security` (SECQ integration)
- `accessibility` (a11y suite integration)

## Telegram listener mode
```bash
python main.py --config config/product.yaml --telegram-listen
```
(Requires `agent.channels.telegram.bot_token` in config.)

## Wave4 hardening pack
- Real contract execution (not just schema): `POST /wave4/contract/execute`
- ETL data drift analyzer + persisted reports:
  - `POST /wave4/drift/analyze`
  - `GET /wave4/drift/reports`
- API security fuzzing + authz smoke + persisted findings:
  - `POST /wave4/security/fuzz`
  - `GET /wave4/security/fuzz/reports`
- Soak/endurance test runner + percentile persistence:
  - `POST /wave4/performance/soak`
  - `GET /wave4/performance/soak/reports`
- Native channel send adapters:
  - Slack + Discord adapters
  - unified API hook: `POST /channels/send`
  - generic webhook ingress kept: `POST /webhook/{channel}`
- React UI: new **Wave4** tab for contract execution, drift, fuzz, soak, and native channel smoke send.

Wave4 artifacts:
- `reports/wave4-drift-reports.json`
- `reports/wave4-fuzz-reports.json`
- `reports/wave4-soak-reports.json`

## Wave4.1 hardening pack
- OIDC/JWT hardening (with HS256 fallback preserved):
  - `GET /wave4.1/auth/status`
  - `GET /wave4.1/auth/verify`
- OPA-compatible policy adapter (falls back to local policy when OPA is unavailable):
  - `POST /wave4.1/policy/evaluate`
- Worker/queue readiness hardening:
  - `GET /wave4.1/queue/readiness`
  - `POST /wave4.1/queue/startup-verify`
- Channel expansion:
  - Native Microsoft Teams adapter (`app/channels/teams.py`)
  - `POST /channels/send` now supports `teams`
- React UI:
  - New **Wave4.1** panel showing auth mode status, policy evaluate action, queue readiness/startup verify, and channel smoke send.

### Wave4.1 auth/policy environment
- `JWT_AUTH_MODE=auto|hs256|oidc`
- `JWT_AUTH_ALLOW_FALLBACK=true|false`
- `OIDC_ISSUER_URL`, `OIDC_JWKS_URL`, `OIDC_AUDIENCE`, `OIDC_ALGORITHMS`
- `OPA_POLICY_URL`, `OPA_TIMEOUT_SECONDS`

### Wave4.1 worker deployment compose
- `deploy/docker-compose.wave41.yml` (profiles: `api`, `worker`, `queue`, `prod`, `ops`)

Run examples:
```bash
docker compose -f deploy/docker-compose.wave41.yml --profile prod up -d
curl -H 'X-API-Key: viewer-token' http://localhost:8090/wave4.1/auth/status
curl -H 'X-API-Key: viewer-token' http://localhost:8090/wave4.1/queue/readiness
```

## CI/CD wiring (Wave4)
- `.github/workflows/quality-gates.yml` → install + pytest gate
- `.github/workflows/promotion-sim.yml` → quality gate + promotion simulation + rollback hook on failure
- `scripts/rollback_hook.sh` → rollback stub for environment-specific implementation

## Notes
- Functional feature reuses the Python agentic framework workflows.
- Security feature reuses SECQ runner.
- Non-functional feature currently includes HTTP SLA and light load checks.
- Telegram, Slack, and Discord now support native send adapters; webhook ingress (`/webhook/{channel}`) remains for generic channel wiring.

## ETL Testing Module
The platform now includes a profile-driven ETL validation engine under `app/etl`.

Config + sample data:
- `etl/profiles.yaml`
- `etl/source_orders.csv`
- `etl/target_orders.csv`

ETL API endpoints:
- `GET /etl/profiles`
- `POST /etl/run`
- `GET /etl/last-report`

Generated report:
- `reports/etl-report.json`

## Product scripts
- `make bootstrap`
- `make api`
- `make worker`
- `make ui`
- `make stack`
- `make test`

Deployment details: `docs/DEPLOYMENT.md`
