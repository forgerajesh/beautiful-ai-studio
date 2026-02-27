# Simple LangChain + LangGraph Agent

Minimal Python agent with:
1. **Memory node** (remember/recall tools, persisted in `memory.json`)
2. **ReAct-style planning node** (planner creates short execution plan)
3. **Telegram interface** (long-poll bot)

## Setup
```bash
cd /home/vnc/.openclaw/workspace/projects/simple-langchain-langgraph-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set OPENAI_API_KEY
# optional: set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID
```

## CLI Run
```bash
python agent.py
```

Example prompts:
- `remember that my client call is at 6 PM`
- `recall recent notes`
- `what is 23 * 17 + 9?`
- `what time is it in UTC?`

## Telegram Run
```bash
python agent_telegram.py
```

- Create bot via BotFather
- Put token in `.env` as `TELEGRAM_BOT_TOKEN`
- Optional safety: set `TELEGRAM_CHAT_ID` to restrict replies to one chat

## Notes
- `memory.json` is local persistent memory.
- Default model: `gpt-4o-mini` (override via `OPENAI_MODEL`).
