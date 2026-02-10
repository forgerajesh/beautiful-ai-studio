# Agentic Playwright Automation Framework (Telegram + WhatsApp)

A practical agentic automation framework using **Playwright** with:
- **Natural-language → workflow generation**
- **Run history dashboard**
- **Retry queue + concurrency control**
- Telegram + WhatsApp notifications

## Features implemented

### 1) Natural-language planner
Generate workflow JSON from prompt:
```bash
npm run plan
# or
node src/index.js --plan "login to saucedemo and verify inventory" --out ./examples/generated-workflow.json
```
- Uses OpenAI-compatible API if `OPENAI_API_KEY` is set
- Falls back to deterministic local generator if AI is unavailable

### 2) Run history dashboard
Build dashboard from run history:
```bash
npm run dashboard
```
Outputs:
- `reports/run-history.json`
- `reports/dashboard.html`

### 3) Retry queue + concurrency control
Telegram listener mode now executes queued runs with:
- configurable concurrency (`RUN_CONCURRENCY`)
- configurable retries (`RUN_RETRIES`)

---

## Setup
```bash
cd /home/vnc/.openclaw/workspace/projects/agentic-automation-framework
cp .env.example .env
npm install
npx playwright install chromium
```

## Configure `.env`
- `HEADLESS=true|false`
- `OPENAI_API_KEY` (optional, for AI workflow planning)
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TO`
- `TELEGRAM_ALLOWED_USER_IDS` (optional access control)
- `RUN_CONCURRENCY`, `RUN_RETRIES`

---

## Run a workflow once
```bash
node src/index.js --workflow ./examples/saucedemo-login.json --notify
```

## Telegram listener (agent mode)
```bash
npm run telegram:listen
```

Supported Telegram commands:
- `/run <workflow-path>`
- `/plan <natural language prompt>`
- `/dashboard`

Example:
```text
/run ./examples/saucedemo-login.json
/plan login to saucedemo and take screenshot after inventory page
/dashboard
```

---

## Workflow schema
```json
{
  "name": "my workflow",
  "url": "https://example.com",
  "steps": [
    { "action": "type", "selector": "#user", "text": "demo" },
    { "action": "click", "selector": "#login" },
    { "action": "expectUrlContains", "value": "dashboard" },
    { "action": "screenshot", "path": "reports/final.png" }
  ]
}
```

Supported actions:
- `type`
- `click`
- `waitFor`
- `expectUrlContains`
- `screenshot`

---

## Security best practices
- Restrict bot commands with `TELEGRAM_ALLOWED_USER_IDS`
- Use least-privilege WhatsApp tokens
- Keep `.env` out of source control
- Store secrets in vault/secret manager for production

---

## Next upgrades (optional)
- Persistent queue backend (Redis/Postgres)
- Multi-tenant RBAC
- Browser session pooling
- Smart self-healing selectors
- LLM-based step validator and risk scoring
