# Simple LangChain + LangGraph Agent

A minimal Python agent using:
- **LangChain** (LLM + tools)
- **LangGraph** (state graph + tool loop)

## Features
- Tool calling for:
  - `add(a, b)`
  - `multiply(a, b)`
  - `utc_now()`
- Graph flow:
  - assistant node
  - tool node
  - conditional route back to assistant until done

## Setup
```bash
cd /home/vnc/.openclaw/workspace/projects/simple-langchain-langgraph-agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# set OPENAI_API_KEY in .env
```

## Run
```bash
python agent.py
```

Example prompts:
- `what is 23 * 17 + 9?`
- `what time is it in UTC?`
- `add 22.5 and 11.4`

## Notes
- Requires valid `OPENAI_API_KEY`.
- Default model: `gpt-4o-mini` (override with `OPENAI_MODEL`).
