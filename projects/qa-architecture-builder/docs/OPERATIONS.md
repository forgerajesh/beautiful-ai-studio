# QA Architecture Builder v2 - Operations

## One-command run
```bash
cd projects/qa-architecture-builder
./run-v2.sh
```

App will be available at:
- UI + API: `http://localhost:8101`
- WebSocket: `ws://localhost:8101/ws/v2`

## Environment variables
- `PORT` (default: `8101`)
- `DB_PATH` (default: `server/qa_builder_v2.db`)
- `JWT_SECRET` (default dev stub)
- `JIRA_MOCK_MODE` (`true` by default; set `false` for non-mock stub mode)

## Demo credentials (stub)
- admin / admin
- architect / architect
- viewer / viewer

## Key operational checks
- Health endpoint: `GET /api/v2/health`
- Jira logs: `GET /api/v2/integrations/jira/health`
- Version history: `GET /api/v2/boards/:id/versions`
- Dashboard: `GET /api/v2/dashboard/board/:id`

## Troubleshooting
- If dependencies fail: run `npm install` manually.
- If DB needs reset: delete `server/qa_builder_v2.db` and restart.
- If websocket not connecting: ensure same host/port and `/ws/v2` path.
