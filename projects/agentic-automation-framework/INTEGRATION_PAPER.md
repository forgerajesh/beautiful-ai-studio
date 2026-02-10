# Agentic Automation Framework Integration Paper

## Title
**Practical Integration Guide for Agentic Browser Automation with Playwright, Telegram, and WhatsApp**

## Abstract
This paper explains how to integrate the Agentic Automation Framework into real engineering workflows. It covers architecture, environment setup, channel integration (Telegram + WhatsApp), CI-friendly execution patterns, and practical usage examples. The goal is to make browser automation remotely triggerable, observable, and production-ready with minimal operational overhead.

---

## 1. Introduction
Traditional UI automation is often script-centric and isolated from daily operations. Teams need automation that is:
- remotely triggerable,
- integrated with collaboration channels,
- robust via retries and queueing,
- simple enough for non-automation specialists to use.

This framework addresses those needs by combining:
- **Playwright** for reliable browser control,
- **Agentic orchestration** (plan/execute/report behaviors),
- **Telegram and WhatsApp** for command + notification interfaces,
- **run-history dashboard** for visibility.

---

## 2. Integration Architecture

### 2.1 Core Components
- **Workflow Engine** (`src/agent/engine.js`): runs JSON-defined workflows.
- **Playwright Runner** (`src/playwright/runner.js`): executes low-level browser steps.
- **Planner** (`src/agent/planner.js`): converts natural-language prompts into workflow JSON (AI or fallback).
- **Queue** (`src/agent/queue.js`): handles concurrent jobs + retries.
- **Channels**:
  - Telegram (`src/channels/telegram.js`)
  - WhatsApp (`src/channels/whatsapp.js`)
- **History + Dashboard** (`src/agent/history.js`): stores runs and builds HTML dashboard.

### 2.2 Operational Modes
1. **One-shot mode**: run a workflow file directly.
2. **Planner mode**: generate workflow from prompt.
3. **Telegram listener mode**: run `/run`, `/plan`, `/dashboard` commands remotely.

---

## 3. Environment Integration

## 3.1 Install
```bash
cd /home/vnc/.openclaw/workspace/projects/agentic-automation-framework
cp .env.example .env
npm install
npx playwright install chromium
```

## 3.2 Required Environment Variables

### Telegram
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- Optional: `TELEGRAM_ALLOWED_USER_IDS`

### WhatsApp Cloud API
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_TO`

### Planner (optional AI enhancement)
- `OPENAI_API_KEY`
- Optional: `OPENAI_MODEL`, `OPENAI_BASE_URL`

### Queue controls
- `RUN_CONCURRENCY` (default: 2)
- `RUN_RETRIES` (default: 1)

---

## 4. How to Integrate (Step-by-Step)

## Step 1 — Baseline Local Validation
Run predefined workflow:
```bash
node src/index.js --workflow ./examples/saucedemo-login.json --notify
```

Expected outputs:
- `reports/saucedemo-inventory.png`
- `reports/run-history.json`
- `reports/dashboard.html`

## Step 2 — Enable Telegram Remote Control
```bash
npm run telegram:listen
```
Then in Telegram:
```text
/run ./examples/saucedemo-login.json
```

## Step 3 — Enable Planner Workflow Generation
```bash
node src/index.js --plan "login to saucedemo and verify inventory" --out ./examples/generated-workflow.json
```

## Step 4 — Execute Generated Workflow
```bash
node src/index.js --workflow ./examples/generated-workflow.json --notify
```

## Step 5 — Dashboard Review
```bash
npm run dashboard
```
Open:
- `reports/dashboard.html`

---

## 5. Example Usage Scenarios

## Scenario A — Daily Smoke Validation
**Objective:** verify login path every morning.

Command:
```bash
node src/index.js --workflow ./examples/saucedemo-login.json --notify
```

Outcome:
- Channel notifications (Telegram/WhatsApp)
- Screenshot evidence
- Updated run history

## Scenario B — On-demand Remote Trigger by QA Lead
**Objective:** run workflow from mobile without SSH.

Telegram command:
```text
/run ./examples/saucedemo-login.json
```

Outcome:
- queued execution
- retry on failure (if configured)
- completion response in Telegram

## Scenario C — Prompt-to-Test for Fast Prototyping
**Objective:** reduce authoring time for simple checks.

Command:
```bash
node src/index.js --plan "open saucedemo login and capture screenshot" --out ./examples/prompt-test.json
```
Then run:
```bash
node src/index.js --workflow ./examples/prompt-test.json
```

---

## 6. Workflow Specification (Reference)

```json
{
  "name": "SauceDemo login smoke",
  "url": "https://www.saucedemo.com/",
  "steps": [
    { "action": "type", "selector": "#user-name", "text": "standard_user" },
    { "action": "type", "selector": "#password", "text": "secret_sauce" },
    { "action": "click", "selector": "#login-button" },
    { "action": "expectUrlContains", "value": "inventory.html" },
    { "action": "screenshot", "path": "reports/saucedemo-inventory.png" }
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

## 7. CI/CD Integration Pattern

Recommended pipeline stages:
1. Install dependencies
2. Install Playwright browser
3. Run selected workflows
4. Archive screenshots + dashboard artifacts
5. Notify channels

Minimal example:
```bash
npm install
npx playwright install chromium
node src/index.js --workflow ./examples/saucedemo-login.json --notify
```

---

## 8. Security Considerations
- Keep `.env` out of version control.
- Restrict Telegram command access with `TELEGRAM_ALLOWED_USER_IDS`.
- Use least-privilege Meta token scope for WhatsApp.
- Rotate API tokens periodically.
- Add allowlisted workflow directories to prevent arbitrary file execution.

---

## 9. Reliability Recommendations
- Keep workflows atomic and small.
- Use queue retries for transient UI failures.
- Capture screenshots on every critical checkpoint.
- Add structured run IDs for traceability.
- Add health checks for listener process in production.

---

## 10. Current Limitations and Next Enhancements
### Current
- JSON workflow schema is intentionally minimal.
- No persistent queue backend yet.
- No role-based command governance yet.

### Next
- Redis-backed durable queue.
- Role-based command policies.
- Workflow registry + approval flow.
- Rich HTML execution report with step-level timings.

---

## 11. Conclusion
This framework provides a strong integration baseline for agentic browser automation. It combines reliable execution (Playwright), operational accessibility (Telegram/WhatsApp), and product-like usability (planner + dashboard + queue). Teams can adopt it quickly for smoke, regression-lite, and remote-triggered validations, then scale it toward enterprise governance.

---

## Appendix A — Useful Commands

```bash
# Run example workflow
node src/index.js --workflow ./examples/saucedemo-login.json --notify

# Generate workflow from prompt
node src/index.js --plan "login to saucedemo and verify inventory" --out ./examples/generated-workflow.json

# Start Telegram listener
npm run telegram:listen

# Build dashboard from history
npm run dashboard
```
