# QA Architecture Builder v2 - Architecture

## Overview
v2 upgrades the original static board editor into a production-style MVP with:
- Node/Express API + SQLite persistence (Postgres-ready logical schema)
- JWT auth stubs + basic RBAC
- WebSocket real-time board collaboration + presence per board room
- Jira integration module (mock mode + endpoint stubs + sync health logs)
- Executive dashboard metrics and risk trend from version snapshots
- Board versioning, diff, and restore

## Runtime Components

### Frontend (existing + v2 panel)
- Existing drag/drop UI remains intact (`index.html`, `app.js`, `styles.css`)
- Added enterprise v2 panel for:
  - login
  - save snapshots
  - dashboard load
  - Jira push/pull mock actions
  - presence display via WebSocket

### Backend API
- Entry: `server/index.js`
- Data layer: `server/db.js`
- Auth: `server/auth.js`
- RBAC: `server/rbac.js`
- Dashboard/diff metrics: `server/metrics.js`
- Jira integration + sync logs: `server/jira.js`

## Data Model (SQLite schema, Postgres-ready)
- `boards` (board metadata + latest data_json + workflow_state)
- `board_versions` (immutable snapshots by version_number)
- `comments` (board comments)
- `workflow_history` (state transitions)
- `jira_sync_logs` (push/pull health and details)

## Realtime Collaboration
WebSocket path: `/ws/v2`
- Rooms keyed by `boardId`
- Events:
  - `join`
  - `presence`
  - `board:update`
  - `board:restore`
  - `comment:add`
  - `workflow:update`

## API Surface (key routes)
- Auth: `POST /api/v2/auth/login`
- Boards: CRUD-like v2 routes under `/api/v2/boards`
- Versions: list, diff, restore
- Comments: list/add
- Workflow: transition endpoint
- Jira: push/pull/health stubs
- Dashboard: board metrics + risk trend

## Security (MVP)
- JWT validation middleware with guest fallback for read
- Role checks via middleware (`admin`, `architect`, `viewer`)
- Stub user model for demo; replace with enterprise IdP in real deployment
