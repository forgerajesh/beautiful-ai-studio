# QA Architecture Builder

Enterprise-ready QA architecture modeling tool with drag/drop board designer and v2 backend collaboration stack.

## v2 Enterprise MVP delivered

### 1) Backend (Node/Express + SQLite, Postgres-ready schema)
- REST API under `/api/v2`
- SQLite persistence (`server/qa_builder_v2.db`)
- Schema includes:
  - `boards`
  - `board_versions`
  - `comments`
  - `workflow_history`
  - `jira_sync_logs`
- JWT auth stubs + RBAC middleware (`admin`, `architect`, `viewer`)

### 2) Realtime collaboration
- WebSocket server at `/ws/v2`
- Single-room model per board
- Presence broadcasting and board update events

### 3) Jira integration module
- Mock mode by default
- Endpoint stubs:
  - push sync
  - pull sync
  - sync health log listing
- Logs persisted for operational visibility

### 4) Executive dashboard
- Endpoint computes:
  - architecture completeness
  - risk trend from snapshots/versions
  - automation readiness
  - release readiness
- UI panel in inspector for loading metrics

### 5) Versioning, diff, restore
- Every board update can create a version snapshot
- Diff endpoint between two versions
- Restore endpoint to rollback to selected version

### 6) Docs + one-command run
- Architecture doc: `docs/ARCHITECTURE.md`
- Operations doc: `docs/OPERATIONS.md`
- One-command run script: `run-v2.sh`

---

## Run (one command)
```bash
cd projects/qa-architecture-builder
./run-v2.sh
```

Open:
- `http://localhost:8101`

## Manual run
```bash
npm install
npm run dev
```

## Demo credentials (stub)
- `admin / admin`
- `architect / architect`
- `viewer / viewer`

## Key API examples
- `POST /api/v2/auth/login`
- `GET /api/v2/boards`
- `POST /api/v2/boards`
- `PUT /api/v2/boards/:id`
- `GET /api/v2/boards/:id/versions`
- `GET /api/v2/boards/:id/diff/:fromVersion/:toVersion`
- `POST /api/v2/boards/:id/restore/:versionNumber`
- `POST /api/v2/integrations/jira/push/:boardId`
- `POST /api/v2/integrations/jira/pull/:boardId`
- `GET /api/v2/integrations/jira/health`
- `GET /api/v2/dashboard/board/:id`

## Notes
- Existing frontend interactions remain unchanged.
- v2 capabilities are added via backend APIs and the Enterprise v2 panel in UI.
