# Operations Runbook (Wave3)

## Local run
```bash
cd projects/qa-architecture-builder
npm install
npm run dev
```
Health check:
```bash
curl http://localhost:8101/api/v2/health
```

## Production compose
```bash
cd projects/qa-architecture-builder
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

## Kubernetes baseline
```bash
kubectl apply -f deploy/k8s/pvc.yaml
kubectl apply -f deploy/k8s/deployment.yaml
```

## Backup / restore
Backup:
```bash
./deploy/scripts/backup.sh
```
Restore:
```bash
./deploy/scripts/restore.sh backups/<file>.sqlite
```

## Demo API smoke (wave3)
1. Login:
```bash
curl -s -X POST http://localhost:8101/api/v2/auth/login -H 'Content-Type: application/json' -d '{"username":"architect","password":"architect"}'
```
2. Use token as `Authorization: Bearer <token>` for v3 calls.

## Recommended operational checks
- `/api/v2/health` returns `status: ok`
- WebSocket `/ws/v2` presence updates working
- `integration_sync_queue` has no stale `retry/conflict` entries
- Governance instances not stuck past SLA window
- Portfolio forecast trend reviewed before release CAB

## Incident hints
- If DB lock/contention occurs: restart app and inspect long-running writes
- If patch merge mismatch appears: inspect `collab_ops` by board/opId and replay order
- If integration conflicts spike: re-check mapping config and remote field ownership
