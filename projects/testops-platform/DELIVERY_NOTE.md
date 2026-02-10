# Delivery Note — Production Polish Upgrade

## What changed

### 1) ETL Testing Module
- Added new package: `app/etl/`
  - `engine.py` with profile-driven ETL execution and checks:
    - schema validation
    - rowcount reconciliation
    - null checks
    - duplicate checks
    - PK null checks
    - freshness/latency checks
    - business rule checks
- Added ETL API endpoints:
  - `POST /etl/run`
  - `GET /etl/profiles`
  - `GET /etl/last-report`
- Added sample ETL assets:
  - `etl/profiles.yaml`
  - `etl/source_orders.csv`
  - `etl/target_orders.csv`
- Added generated report output:
  - `reports/etl-report.json`
- Integrated ETL summary card in server-rendered dashboard template.

### 2) Beautiful UI Refresh (React)
- Reworked UX to a cleaner command-center layout with:
  - sidebar tabs/navigation
  - KPI hero strip
  - grouped sections and cards
  - improved trend + heatmap visuals
  - responsive breakpoints for laptop/mobile
- Ensured existing capabilities remain reachable across structured tabs.
- Added ETL section integrated with new ETL endpoints.

### 3) Productization
- Added `Makefile` targets:
  - `make bootstrap`, `make api`, `make worker`, `make ui`, `make stack`, `make test`, `make etl`
- Added runnable scripts:
  - `scripts/bootstrap.sh`
  - `scripts/run-api.sh`
  - `scripts/run-worker.sh`
  - `scripts/run-ui.sh`
- Added `.env.example` with clear grouped env vars.
- Added deployment/quickstart doc: `docs/DEPLOYMENT.md`.

### 4) Testing + Quality
- Added ETL tests:
  - `tests/test_etl.py` (core ETL checks + endpoints)
- Updated API catalog tests to include ETL profile endpoint.
- Full test suite status: **32 passed**.

### 5) Deployment Readiness
- Added root `docker-compose.yml` for:
  - `api`, `worker`, `ui`, `redis`
  - healthchecks included for all services
- Added Dockerfiles:
  - `Dockerfile` (API/worker image)
  - `ui-react/Dockerfile` (UI image)
- Updated `/health` to reflect ETL readiness (`etl_ready`).
- Updated `/doctor` checks with ETL config/data readiness checks.

## Verified run commands
```bash
make bootstrap
make api
make worker
make ui
make test
make stack
```

## Current status
- Backend, ETL module, and UI changes implemented.
- Tests passing (`32 passed`).
- UI production build succeeds (`npm run build`).
- Docker Compose stack + deployment docs are in place.
