# Architecture Overview (Wave3)

## Stack
- Frontend: static HTML/CSS/JS (`index.html`, `app.js`)
- Backend: Node.js + Express + SQLite
- Realtime: WebSocket (`/ws/v2`)

## Core modules
- `server/index.js`:
  - v2 APIs (boards, versions, workflow, comments, Jira mock)
  - WebSocket room/presence and board broadcasts
- `server/wave3.js`:
  - v3 enterprise modules (collab patches, SSO scaffolding, governance, marketplace, integrations, compliance, analytics, exports, AI draft)
- `server/db.js`:
  - schema init + wave3 tables

## Wave3 data model (major tables)
- Collaboration: `collab_state`, `collab_ops`
- SSO/provisioning: `sso_configs`, `orgs`, `provisioned_users`, `provisioning_logs`
- Governance: `governance_policies`, `governance_instances`, `governance_actions`
- Marketplace: `marketplace_templates`, `marketplace_template_versions`, `marketplace_ratings`
- Integration: `integration_mappings`, `integration_sync_queue`, `integration_conflict_logs`
- Compliance: `compliance_mappings`

## Deterministic collaboration strategy
- Client sends operation list with `opId`, `baseVersion`, `ts`, `actor`
- Server stores unseen ops (idempotency by `board_id + op_id`)
- Merge applies sorted operations (ts/opId tie-break)
- Field-level updates use deterministic last-writer ordering
- Server increments board version and emits merged payload

## Portfolio analytics
- Per-board metrics from board graph
- Version trend sampled from recent versions
- Risk forecast from slope extrapolation

## Export architecture
- API emits narrative bundles:
  - PDF-ready markdown text
  - PPT-ready outline payload
  - structured JSON metrics artifact

## Deployment
- Docker compose production profile in `deploy/docker-compose.prod.yml`
- Kubernetes baseline in `deploy/k8s/`
- Backup/restore scripts in `deploy/scripts/`
- Prometheus rule skeleton in `deploy/observability/`
