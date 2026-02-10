# Deployment & Quickstart

## One-command local stack (recommended)
```bash
make stack
```
This builds and runs API + worker + UI + Redis via `docker-compose.yml`.

## Fast local development
```bash
make bootstrap
make api      # terminal 1
make worker   # terminal 2
make ui       # terminal 3
```

## ETL module smoke
```bash
make etl
curl -X POST http://localhost:8090/etl/run -H 'X-API-Key: operator-token' -H 'Content-Type: application/json' -d '{"profile":"retail_orders"}'
```

## Runtime checks
- API health: `GET /health`
- Doctor: `GET /doctor`
- ETL report: `GET /etl/last-report`

## Docker services
- `redis` : queue broker/result backend
- `api` : FastAPI product API
- `worker` : Celery worker
- `ui` : React control center

All services include health checks for deployment readiness.
