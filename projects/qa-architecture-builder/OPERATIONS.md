# Operations Runbook (Wave3+ Production Polish)

## Local run
```bash
cd projects/qa-architecture-builder
npm install
npm run dev
```

Health checks:
```bash
curl http://localhost:8101/api/v2/health
curl http://localhost:8101/api/v2/health/deep
./deploy/scripts/healthcheck.sh http://localhost:8101
```

## Production compose
```bash
cd projects/qa-architecture-builder
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

## Reverse proxy + TLS
- Sample Nginx config: `deploy/nginx/qa-architecture-builder.conf`
- Replace domain/cert paths, then reload nginx.
- WebSocket upgrade headers are included for `/ws/v2`.

## Kubernetes baseline
```bash
kubectl apply -f deploy/k8s/pvc.yaml
kubectl apply -f deploy/k8s/deployment.yaml
```

## Backup / restore
Manual backup:
```bash
./deploy/scripts/backup.sh
```
Restore:
```bash
./deploy/scripts/restore.sh backups/<file>.sqlite
```

Suggested cron (daily 02:15 UTC):
```bash
15 2 * * * /path/to/qa-architecture-builder/deploy/scripts/backup-cron.sh
```

## Alerting hook
```bash
export ALERT_WEBHOOK_URL="https://hooks.example.com/qa-alerts"
./deploy/scripts/alert-hook.sh "healthcheck-failed" "deep health endpoint returned non-200"
```

Prometheus rules: `deploy/observability/prometheus-rules.yml`

## SSO wiring checklist
1. Configure provider via `/api/v3/auth/sso/config` (OIDC discovery validated).
2. Set env-based providers (`SSO_PROVIDERS_JSON` or `OIDC_*`) for token verification scaffold.
3. Keep local auth only for break-glass admin/test.

## Integration settings hardening
- Use `/api/v3/integrations/settings/:provider` for Jira/Azure DevOps.
- API validates base URL + project fields.
- Credentials are transformed to secure placeholder refs (`kms-placeholder://...`) and masked values.
- Replace placeholders with real vault/KMS integration in production rollout.

## Demo API smoke (wave3)
1. Login:
```bash
curl -s -X POST http://localhost:8101/api/v2/auth/login -H 'Content-Type: application/json' -d '{"username":"architect","password":"architect"}'
```
2. Use token as `Authorization: Bearer <token>` for v3 calls.

## Recommended operational checks
- `/api/v2/health` and `/api/v2/health/deep` return `status: ok`
- WebSocket `/ws/v2` presence updates working
- `integration_sync_queue` has no stale `retry/conflict` entries
- Governance instances not stuck past SLA window
- Portfolio forecast trend reviewed before release CAB
- Backups generated daily and retained for 14 days

## Incident hints
- If DB lock/contention occurs: restart app and inspect long-running writes
- If patch merge mismatch appears: inspect `collab_ops` by board/opId and replay order
- If integration conflicts spike: re-check mapping config and remote field ownership
- If SSO token validation fails: verify issuer/audience and env provider catalog
