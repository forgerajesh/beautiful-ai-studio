# Immutable Audit Retention Policy

## Objective
All security, provisioning, and governance audit events are retained immutably to satisfy SOC2 and ISO27001 evidence requirements.

## Policy
- Retention period: **2555 days** (7 years)
- Storage mode: **object-lock enabled** (WORM)
- Legal hold: **supported** for litigation and regulatory requests
- Deletion before retention expiry: **not permitted**

## Scope
- SCIM provisioning logs
- Promotion/approval decisions
- Alert dispatch logs
- DR drill artifacts and summaries

## Verification
Use API endpoint:
- `GET /wave6/compliance/audit-retention`

This endpoint returns current runtime retention status and documentation path.
