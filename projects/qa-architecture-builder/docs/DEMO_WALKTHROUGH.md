# Demo Walkthrough (8-10 minutes)

## Setup
1. `npm install && npm run dev`
2. Open `http://localhost:8101`
3. Click **Login as Architect**

## Flow
1. **Board baseline (1 min)**
   - Apply a reference template and save board snapshot.
   - Show risk/completeness metrics.

2. **SSO production scaffold (2 min)**
   - Trigger **SSO Provision**.
   - Explain: config validation + OIDC discovery + token verification abstraction.
   - Mention env-driven providers for deployment (`SSO_PROVIDERS_JSON` / `OIDC_*`).

3. **Integration hardening (2 min)**
   - In Integration Settings, set provider, base URL, project key, token.
   - Click **Save Integration Settings**.
   - Show response includes masked/placeholder secret references.
   - Run **Queue DevOps Sync** to confirm existing flow remains intact.

4. **Branded exports (2 min)**
   - Update company + color under Branding.
   - Click **Generate PDF/PPT Artifacts**.
   - Explain output now includes brand theme/templates from config.

5. **Ops readiness (1-2 min)**
   - Show `/api/v2/health/deep`.
   - Mention Nginx TLS reverse-proxy sample, backup cron helper, and alert hook.

## Close
- Reference docs:
  - `OPERATIONS.md`
  - `docs/UAT_CHECKLIST.md`
  - `deploy/nginx/qa-architecture-builder.conf`
