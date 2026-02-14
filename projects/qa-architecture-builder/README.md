# QA Architecture Builder (Enterprise Wave3)

QA Architecture Builder is a visual architecture board for QA/test strategy design, now expanded with **enterprise wave3 capabilities**.

## Wave3 features implemented

1. **Conflict-safe realtime collaboration**
   - Deterministic patch merge endpoint (`/api/v3/collab/boards/:id/patches`)
   - Operation ledger (`collab_ops`) and server version state (`collab_state`)
   - Idempotent op handling by `opId`

2. **Production-oriented SSO wiring scaffolding**
   - OIDC/SAML provider config with validation + OIDC discovery verification (`/api/v3/auth/sso/config`)
   - Token verification middleware abstraction (local JWT + env-driven external OIDC scaffold)
   - Org + user provisioning model (`orgs`, `provisioned_users`, `provisioning_logs`)

3. **Granular governance workflow engine**
   - Policy definition with stage chain + SLA metadata + exception path
   - Start workflow per board and apply actions (approve/reject/exception)

4. **Template marketplace**
   - Publish templates with version/tags/approval status
   - Rate templates with aggregate score

5. **Advanced Jira/Azure DevOps integration layer**
   - Hardened integration settings API with provider-specific validation
   - Secure credential storage placeholders (`kms-placeholder://...` refs + masked display)
   - Sync queue with process/retry/conflict handling
   - Conflict log tracking

6. **Compliance mapping module**
   - OWASP/ISO/SOC2 (or custom framework) control mappings
   - Evidence link storage per control

7. **Executive portfolio analytics**
   - Multi-board trends + forecast risk trajectory

8. **Export suite**
   - Narrative-ready PDF/PPT stubs + JSON artifact bundle (`/api/v3/exports/board/:id`)
   - Branded export themes/templates via configurable `config/branding.json` and `/api/v3/exports/branding`

9. **AI draft-from-requirements flow**
   - Requirement text/file-content parsing to architecture draft
   - Gap report + phased roadmap output

10. **Deployment hardening assets**
   - `deploy/docker-compose.prod.yml`
   - Kubernetes baseline manifests
   - Nginx reverse-proxy TLS sample (`deploy/nginx/qa-architecture-builder.conf`)
   - Backup/restore scripts + backup cron helper
   - Healthcheck and alert hook scripts
   - Observability alert rules

## Run

```bash
cd projects/qa-architecture-builder
npm install
npm run dev
# app: http://localhost:8101
```

or:

```bash
./run-v2.sh
```

## Demo flow (2-3 min)

1. Open app and click **Login as Architect** (v2 panel)
2. Build/edit a board and click **Save Board Snapshot**
3. In **Wave3 Enterprise** section click:
   - Apply Conflict-safe Patch
   - SSO Provision Stub
   - Run Governance Flow
   - Publish to Marketplace
   - Queue DevOps Sync
   - Map OWASP/ISO/SOC2
   - Load Portfolio Analytics
   - Generate PDF/PPT Artifacts
   - AI Draft from Requirements

## Credentials (stub)
- `admin / admin`
- `architect / architect`
- `viewer / viewer`

## Key environment variables
- `JWT_SECRET` - local JWT signing secret
- `SSO_PROVIDERS_JSON` - JSON array of external SSO provider metadata
- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_AUDIENCE`, `OIDC_METADATA_URL` - single-provider fallback
- `BRANDING_FILE` - optional path override for branding config (default `config/branding.json`)
- `ALERT_WEBHOOK_URL` - used by `deploy/scripts/alert-hook.sh`

## Docs
- `ARCHITECTURE.md`
- `OPERATIONS.md`
- `docs/` (extended reference docs)
- `docs/UAT_CHECKLIST.md`
- `docs/DEMO_WALKTHROUGH.md`
