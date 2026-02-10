# Agentic Automation Framework (Python)

Python version of the same agentic framework with Playwright + Telegram + WhatsApp integration.

## Features
- Workflow execution via Playwright (sync API)
- Natural-language planner (`--plan`)
- Claude-like goal mode (`--ask`) with iterative self-correction
- Failure memory (lexical + semantic embeddings)
- Telegram listener commands:
  - `/run <workflow>`
  - `/plan <prompt>`
  - `/ask <goal>`
  - `/memory [goal]`
  - `/dashboard`
- Retry queue + concurrency controls
- Run history dashboard (`reports/dashboard.html`)

## Setup
```bash
cd /home/vnc/.openclaw/workspace/projects/agentic-automation-framework-python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
cp .env.example .env
```

## Commands
```bash
# Run workflow once
python main.py --workflow ./examples/saucedemo-login.json --notify

# Generate workflow from natural language
python main.py --plan "login to saucedemo and verify inventory" --out ./examples/generated-workflow.json

# Claude-like mode (goal → plan → execute → retry)
python main.py --ask "login to saucedemo and verify inventory page" --notify

# Telegram listener mode
python main.py --telegram-listen

# Build dashboard only
python main.py --dashboard
```

## Notes
- If `OPENAI_API_KEY` is not set, planner uses deterministic fallback.
- Semantic memory requires OpenAI embeddings access.
- For production, run listener behind supervisor/systemd and secure env secrets.
