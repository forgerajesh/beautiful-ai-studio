# ETL Testing Automation Framework (ETLQ)

A practical, config-driven ETL/ELT testing framework for **batch + incremental pipelines** with:
- multi-layer data validations
- AI-assisted failure triage
- MCP server integration
- one-command execution UX (`etlq run`)
- email + executive reporting

This starter is built to be **scalable, maintainable, cloud-ready, and CI/CD friendly**.

---

## 1) What this framework solves

ETL/ELT pipelines frequently fail silently (partial loads, broken transformations, stale data, schema drift). This framework gives you:

- repeatable data quality checks as code
- standard assertion patterns across pipelines
- severity-based quality gates in CI/CD
- actionable failure diagnostics (SQL + samples + AI hints)
- an executive-level report for non-technical stakeholders

---

## 2) Current capabilities (implemented)

### Data test types (starter)
- Schema validation
- Rowcount reconciliation
- Business rule checks
- Incremental watermark lag checks
- SCD2 current-record integrity checks
- Auto-generated tests from schema + lineage metadata

### Framework features
- Config-driven tests via YAML
- Reusable assertion helpers (clear failure messages)
- Adapter abstraction (SQLite demo adapter included)
- Severity tagging (`critical`, `high`, `medium`)
- Pytest + JUnit output
- AI triage (OpenAI-compatible)
- AI-generated additional checks from metadata
- MCP server exposing core operations as tools
- Automated email of results (Gmail SMTP)
- One-command workflow via ETLQ CLI
- Branded executive report + trend history + flaky detection

---

## 3) Repository structure

```text
etl-testing-framework/
  agent/
    graphs/
    nodes/
    tools/
    generated/
    run_agent.py
    generate_tests.py
  config/
    tests.yaml
    entities.yaml
    business_rules.yaml
    lineage.yaml
    table_tiers.yaml
  etlq/
    cli.py
  framework/
    adapters/
      base.py
      registry.py
      sqlite_adapter.py
    assertions.py
    config_loader.py
    models.py
    planner.py
    runner_context.py
    ai_assistant.py
    settings.py
  mcp_server/
    server.py
  reports/
    (generated artifacts)
  scripts/
    seed_demo_db.py
    send_email_report.py
    run_and_email.py
    etlq
  tests/
    test_data_quality.py
  requirements.txt
  pytest.ini
  README.md
```

---

## 4) Quick start (local demo)

```bash
cd /home/vnc/.openclaw/workspace/projects/etl-testing-framework
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/seed_demo_db.py
pytest -q --junitxml=reports/junit.xml
```

---

## 5) Run with one command (ETLQ)

```bash
cd /home/vnc/.openclaw/workspace/projects/etl-testing-framework
./scripts/etlq run --email-mode on_fail --brand "Raj Data Quality" --pdf --cio-email
```

### ETLQ options
- `--email-mode`: `never | on_fail | always`
- `--brand`: report branding label
- `--pdf`: best-effort PDF export from HTML report
- `--cio-email`: create one-page CIO summary artifact

### ETLQ output artifacts
- `reports/junit.xml`
- `reports/ai_remediation.md` (if generated)
- `reports/executive_report.html`
- `reports/executive_report.pdf` (if browser available)
- `reports/cio_summary.txt`
- `reports/history.json` (run history)
- `reports/case_history.json` (per-test pass/fail for flaky analysis)

---

## 6) Configuration model

## 6.1 `config/tests.yaml`
Defines test suite and checks.

Example:
```yaml
suite: demo_etl_validation
adapter:
  kind: sqlite
  database_path: demo_etl.db

tests:
  - id: rowcount_source_vs_target
    type: rowcount_recon
    severity: high
    tags: [recon]
    params:
      source_sql: "select count(*) from {{entity.source_orders}}"
      target_sql: "select count(*) from {{entity.target_orders}}"
      tolerance_pct: 0.0
```

## 6.2 `config/entities.yaml`
Decouples logical entity names from physical table names.

```yaml
entity:
  source_orders: source_orders
  target_orders: target_orders
  customer_hist: dim_customer_hist
```

## 6.3 `config/business_rules.yaml`
Reusable rule expressions.

```yaml
rule:
  amount_positive: "amount <= 0"
```

## 6.4 `config/lineage.yaml`
Source→target links for generated reconciliation/integrity checks.

## 6.5 `config/table_tiers.yaml`
Business criticality + weighting for severity ranking of generated tests.

---

## 7) Placeholder rendering (decoupling)

The framework resolves placeholders in config at load time:
- `{{entity.target_orders}}`
- `{{rule.amount_positive}}`

This allows table/rule updates without changing test logic.

---

## 8) Supported test types in starter

Implemented in `tests/test_data_quality.py`:
- `schema`
- `rowcount_recon`
- `business_rule`
- `incremental`
- `scd2`

You can extend by adding new `type` handling blocks and corresponding assertion utilities.

---

## 9) AI features

## 9.1 AI triage on failures
If enabled, failures are enriched with AI remediation guidance.

Enable in `config/tests.yaml`:
```yaml
ai:
  enabled: true
  model: gpt-4o-mini
  base_url: https://api.openai.com/v1
```

Set key:
```bash
export OPENAI_API_KEY=your_key
```

## 9.2 AI suggestions from schema
```bash
PYTHONPATH=. python -m agent.generate_tests
```
Produces:
- `agent/generated/generated_tests.yaml`

Generated checks include:
- schema baseline
- PK uniqueness
- not-null
- freshness heuristic
- lineage reconciliation
- lineage orphan detection

---

## 10) LangChain + LangGraph AI Agent

The agent pipeline currently does:
1. Plan test scope from user request
2. Execute tests (pytest)
3. Analyze failures with LLM
4. Save remediation notes

Run:
```bash
PYTHONPATH=. python -m agent.run_agent --request "run critical ETL checks and provide remediation"
```

---

## 11) MCP server

Start server:
```bash
cd /home/vnc/.openclaw/workspace/projects/etl-testing-framework
source .venv/bin/activate
python -m mcp_server.server
```

Exposed MCP tools:
- `health`
- `run_etl_tests(mark_expr?, email_mode?)`
- `generate_tests_from_metadata()`
- `run_ai_agent(request)`
- `send_results_email()`
- `show_suite_config()`

---

## 12) Email results to Gmail

```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your_gmail@gmail.com
export SMTP_PASS=your_16_char_app_password
export REPORT_FROM=your_gmail@gmail.com
export REPORT_TO=recipient@gmail.com
python scripts/send_email_report.py
```

> Use **Gmail App Password** (not account password).

---

## 13) CI/CD integration example (GitHub Actions)

```yaml
name: etlq-tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: python -m venv .venv
      - run: source .venv/bin/activate && pip install -r requirements.txt
      - run: source .venv/bin/activate && python scripts/seed_demo_db.py
      - run: source .venv/bin/activate && pytest -q --junitxml=reports/junit.xml -m "critical or high"
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: etlq-reports
          path: reports/
```

Recommended gate policy:
- fail pipeline on any `critical` failure
- configurable threshold for `high` failures

---

## 14) How flaky detection works

The framework parses JUnit testcases and stores per-test pass/fail history in:
- `reports/case_history.json`

Flaky score is derived from:
- fail rate over last N runs
- pass/fail transitions frequency

This produces an exact top flaky panel in executive report after a few runs.

---

## 15) Security and compliance notes

- Keep secrets in environment/vault, never in git
- Use least-privilege warehouse roles
- Avoid logging raw PII in failure artifacts
- Limit report distribution if sensitive fields are present
- Prefer masked/synthetic demo data for training environments

---

## 16) Cost and reliability controls (recommended)

- query timeout per test
- sampling for heavy checks
- retries only for transient infra errors
- deterministic windows for incremental tests
- test selection by severity/tags/changed assets

---

## 17) Known limitations (current starter)

- Demo adapter is SQLite only (warehouse adapters pending)
- Flaky scoring improves with accumulated run history
- PDF export depends on installed headless browser
- AI quality depends on prompt + model + available context

---

## 18) Suggested next upgrades

1. Add Snowflake/BigQuery/Databricks adapters
2. Parse dbt artifacts (`manifest.json`, `run_results.json`) for smart selection
3. Add OpenTelemetry metrics + dashboards
4. Add Slack/Teams notification integration
5. Add policy-as-code for enterprise quality gates

---

## 19) Troubleshooting

### `pytest: command not found`
Activate venv and install requirements.

### No AI notes generated
Check `OPENAI_API_KEY` and `ai.enabled` in config.

### Gmail send fails
Use App Password + verify SMTP vars.

### PDF not generated
Install Chromium/Chrome; run with `--pdf`.

---

## 20) License / usage

Internal starter for accelerated ETL testing design and enterprise adaptation.
