# Code LLM Assistant

Simple API service to generate and refactor code using an LLM.

## Endpoints
- `GET /health`
- `POST /generate`
- `POST /refactor`

## Setup
```bash
cd /home/vnc/.openclaw/workspace/projects/code-llm-assistant
cp .env.example .env
# set OPENAI_API_KEY
./run.sh
```

Server starts on `http://0.0.0.0:8090`.

## Example
```bash
curl -X POST http://127.0.0.1:8090/generate \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"build a fastapi hello world with one /health route","language":"python"}'
```
