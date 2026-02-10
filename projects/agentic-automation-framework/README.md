# Agentic Playwright Automation Framework (Telegram + WhatsApp)

A practical agentic automation starter using **Playwright** with outbound notifications to:
- Telegram Bot API
- WhatsApp Cloud API (Meta)

## What you get
- Workflow-driven browser automation (`examples/*.json`)
- Agent engine to execute workflows and send status notifications
- Telegram command listener (`/run <workflow-path>`) for remote triggering
- WhatsApp integration for execution alerts

## Setup
```bash
cd /home/vnc/.openclaw/workspace/projects/agentic-automation-framework
cp .env.example .env
npm install
npx playwright install chromium
```

## Configure `.env`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TO`
- optional `TELEGRAM_ALLOWED_USER_IDS`

## Run a workflow once
```bash
npm run run:example
# or
node src/index.js --workflow ./examples/saucedemo-login.json --notify
```

## Run Telegram listener (agent mode)
```bash
npm run telegram:listen
```
Then in Telegram send:
```text
/run ./examples/saucedemo-login.json
```

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

## Supported actions
- `type`
- `click`
- `waitFor`
- `expectUrlContains`
- `screenshot`

## Security notes
- Restrict Telegram listener with `TELEGRAM_ALLOWED_USER_IDS`
- Use least-privileged WhatsApp tokens
- Keep `.env` out of source control

## Next recommended upgrades
- Add queue + retries + run IDs
- Add RBAC and command signing
- Add persistent run history + HTML dashboard
- Add LLM planner for natural-language to workflow generation
