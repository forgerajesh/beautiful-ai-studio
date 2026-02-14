# UAT Checklist - QA Architecture Builder (Production Polish)

## 1) Authentication & SSO
- [ ] Local login works (`architect/architect`) for non-SSO fallback.
- [ ] `/api/v3/auth/sso/config` rejects invalid config (missing issuer/clientId, bad URL).
- [ ] OIDC discovery validation succeeds for a valid metadata endpoint.
- [ ] Provisioning flow creates/updates org + user.
- [ ] Token auth middleware accepts local JWT and handles invalid token safely.

## 2) Integration Settings Hardening
- [ ] Jira settings save with valid URL/project key.
- [ ] Azure DevOps settings save with valid URL/project name.
- [ ] Invalid provider payloads return 400 with clear error.
- [ ] Stored secret data returns masked values/refs only (no plaintext token leak).
- [ ] Existing sync queue flow still processes `success/retry/conflict` scenarios.

## 3) Export Branding
- [ ] `config/branding.json` exists and loads defaults.
- [ ] `/api/v3/exports/branding` GET returns branding config.
- [ ] `/api/v3/exports/branding` PUT updates company/color theme.
- [ ] `/api/v3/exports/board/:id` includes branding in PDF/PPT/JSON artifacts.

## 4) Deployment & Reliability
- [ ] `/api/v2/health` and `/api/v2/health/deep` return status ok.
- [ ] `deploy/scripts/healthcheck.sh` passes.
- [ ] Backup script runs and creates snapshot in `backups/`.
- [ ] Backup cron helper prunes backups to 14 newest files.
- [ ] Alert hook sends event when `ALERT_WEBHOOK_URL` is configured.
- [ ] Nginx reverse proxy sample works with websocket upgrade.

## 5) Regression (existing features intact)
- [ ] Board create/update/version/restore works.
- [ ] Realtime collaboration/presence still works.
- [ ] Governance workflow actions still function.
- [ ] Marketplace publish/rate still works.
- [ ] AI draft + portfolio analytics still work.
