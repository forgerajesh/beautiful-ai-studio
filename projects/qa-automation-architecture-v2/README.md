# QA Automation Architecture v2 (Playwright + Cypress)

Enterprise-ready unified test architecture for web QA teams using both Playwright and Cypress.

## Goals
- One business-level test intent model
- Dual-runner support (Playwright/Cypress)
- Risk-based execution and release gates
- Strong reliability controls (flake detection, retries, quarantine)
- Evidence-first reporting and governance

## High-Level Modules
- `core/` - engine, DSL, reliability, data
- `domains/` - feature/domain task flows (auth, checkout, orders)
- `tests/` - smoke/critical/regression suites
- `platform/` - framework adapters, reporting, orchestration
- `integrations/` - Jira, TestRail, Slack/Telegram hooks
- `config/` - env and risk policies
- `scripts/` - local and CI execution scripts
- `docs/` - architecture and operating model

## Execution Modes
- **PR Fast Lane**: smoke + changed critical tests
- **Merge Lane**: full critical + partial regression
- **Nightly Deep Lane**: full regression + reliability analytics

## Key Principles
1. Prefer reusable task flows over raw POM-only patterns
2. Make failures diagnosable by default (trace/video/log/network)
3. Gate releases with risk + evidence, not only pass rate
4. Keep test data deterministic and environment-scoped

## Next Build Steps
1. Implement DSL contract in `core/dsl/`
2. Build Playwright adapter in `platform/playwright/`
3. Build Cypress adapter in `platform/cypress/`
4. Add orchestration policy in `platform/orchestration/`
5. Wire CI in `.github/workflows/ci.yml`
