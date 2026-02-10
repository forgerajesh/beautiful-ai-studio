# TestOps Platform (Product-Style Unified Testing)

A feature-oriented testing product combining:
- Functional testing (Playwright workflows)
- Non-functional testing (SLA + light load checks)
- Security testing (SECQ integration)
- OpenClaw-style agent interaction layer across channels

Designed like a productized automation layer: one config, one runner, unified report, and channel-driven commands.

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

Endpoints:
- `GET /health`
- `GET /channels`
- `POST /run?config_path=config/product.yaml`
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

## Notes
- Functional feature reuses the Python agentic framework workflows.
- Security feature reuses SECQ runner.
- Non-functional feature currently includes HTTP SLA and light load checks.
- Telegram is implemented natively (poll/send). Other channels are integrated through webhook ingress (`/webhook/{channel}`) and can be provider-wired with channel credentials.

## Next upgrades
- contract testing layer
- distributed load profiles
- flaky test quarantine + trend analytics
- policy gates by environment and risk profile
