# Delivery Note — Wave4.1 Hardening Pack

## Delivered scope

### 1) OIDC/JWT hardening (with fallback)
- Added hardened auth module:
  - `app/wave41/auth/oidc_jwt.py`
- Existing Wave1 JWT verification now routes through hardened auth path:
  - `app/wave1/auth/jwt_auth.py`
- New endpoints:
  - `GET /wave4.1/auth/status`
  - `GET /wave4.1/auth/verify`
- Behavior:
  - Supports `JWT_AUTH_MODE=auto|hs256|oidc`
  - OIDC mode validates token via JWKS + optional issuer/audience
  - Preserves HS256 fallback (`JWT_AUTH_ALLOW_FALLBACK=true` default)

### 2) Policy engine hardening with OPA adapter
- Added policy adapter:
  - `app/wave41/policy/adapter.py`
- New endpoint:
  - `POST /wave4.1/policy/evaluate`
- Behavior:
  - If `OPA_POLICY_URL` configured → calls OPA-compatible API (`{"input": ...}`)
  - If OPA unavailable/error/not configured → safe fallback to local policy (`app/wave2/policy/engine.py`)

### 3) Worker deployment hardening + queue readiness
- Added queue readiness module:
  - `app/wave41/queue/readiness.py`
- New endpoints:
  - `GET /wave4.1/queue/readiness`
  - `POST /wave4.1/queue/startup-verify`
- Behavior:
  - Verifies Redis broker/backend connectivity when configured
  - Returns ready status + connection diagnostics
- Added production-style compose profile:
  - `deploy/docker-compose.wave41.yml`
  - Includes `redis`, `api`, `worker`, `flower` with healthchecks and profiles

### 4) Channel expansion (native adapter)
- Added Microsoft Teams native adapter:
  - `app/channels/teams.py`
- Updated registry wiring:
  - `app/channels/registry.py`
- API send wiring now supports `teams`:
  - `POST /channels/send`

### 5) React UI hardening panel
- Added **Wave4.1** tab in React UI:
  - Auth mode status refresh
  - Policy evaluate action
  - Queue readiness + startup verify
  - Channel smoke send (teams/slack/discord)
- Updated files:
  - `ui-react/src/App.jsx`
  - `ui-react/src/api.js`

### 6) Tests
- Added Wave4.1 tests with mocks:
  - `tests/test_wave41.py`
- Covers:
  - Auth status + HS256 verify path
  - OPA adapter + local fallback behavior
  - Queue readiness endpoint
  - Teams send wiring through `/channels/send`

### 7) Docs
- Updated:
  - `README.md` (Wave4.1 section, env vars, run commands)
  - `.env.example` (OIDC/JWT/OPA/Teams variables)
  - `config/product.yaml` (teams webhook_url config)

## Verified commands
```bash
cd /home/vnc/.openclaw/workspace/projects/testops-platform
pytest -q
```

Wave4.1 stack run (optional):
```bash
docker compose -f deploy/docker-compose.wave41.yml --profile prod up -d
curl -H 'X-API-Key: viewer-token' http://localhost:8090/wave4.1/auth/status
curl -H 'X-API-Key: viewer-token' http://localhost:8090/wave4.1/queue/readiness
```
