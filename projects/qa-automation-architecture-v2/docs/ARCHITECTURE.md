# Architecture v2 — Unified Playwright + Cypress QA Platform

## 1) Layered Architecture

```text
Business Tests (tests/*)
   ↓
Domain Tasks / Flows (domains/*)
   ↓
Core DSL + Engine (core/dsl, core/engine)
   ↓
Runner Adapters (platform/playwright, platform/cypress)
   ↓
Evidence + Reporting + Integrations (platform/reporting, integrations/*)
```

## 2) Core Components

### A. DSL Layer (`core/dsl`)
Defines business-level actions independent of runner:
- `navigateTo(page)`
- `authenticate(userType)`
- `createOrder(orderType)`
- `assertOutcome(expected)`

### B. Engine Layer (`core/engine`)
- Resolves test plan from tags/risk policy
- Routes execution to selected adapter(s)
- Collects evidence and emits run summary

### C. Reliability Layer (`core/reliability`)
- Retry by failure class
- Flake detector
- Quarantine list
- Locator fallback hooks

### D. Data Layer (`core/data`)
- Test data factory
- Environment-scoped datasets
- Seed/reset hooks

## 3) Runner Adapters

### Playwright Adapter
- Trace/video/screenshot collection
- Multi-browser matrix (chromium/firefox/webkit)
- API + UI test coordination

### Cypress Adapter
- Fast local feedback lane
- Deterministic CI recording artifacts
- Compatible with unified DSL mapping

## 4) Risk-Based Orchestration

Policy example:
- High-risk changes: critical + full regression
- Medium-risk changes: critical + targeted regression
- Low-risk changes: smoke + impacted domains

Inputs for risk score:
- Changed files map
- Defect history for touched domains
- Production incident proximity

## 5) Release Confidence Model

A release is green only when:
1. Critical flows pass
2. No P1/P2 open defects tied to changed scope
3. Environment health checks pass
4. Flake index under policy threshold
5. Evidence bundle generated and archived

## 6) Evidence Bundle

Per run artifact package:
- Execution summary JSON
- JUnit + HTML report
- Video/trace/screenshots
- Network logs
- Failure classification

## 7) Integration Targets

- Jira: defect sync + release ticket updates
- TestRail: test case/result push
- Slack/Telegram: run status + blocker alerts

## 8) KPI Dashboard (minimum)

- Pass rate by lane
- Flake index trend
- Escaped defect trend
- Mean time to triage
- Lead time to release confidence
