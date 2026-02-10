# ETL Testing Automation Framework (Starter Kit)

A practical, config-driven ETL/ELT testing framework designed for scalability and CI/CD.

## Features in this starter
- Config-driven tests (`config/tests.yaml`)
- Adapter abstraction (`framework/adapters/*`)
- Pytest execution + JUnit output
- Assertion helpers with rich failure context
- Sample validations:
  - schema
  - rowcount reconciliation
  - business rule
  - incremental watermark
  - SCD2 current-record integrity

## Quick start
```bash
cd /home/vnc/.openclaw/workspace/projects/etl-testing-framework
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/seed_demo_db.py
pytest -q --junitxml=reports/junit.xml
```

## Folder layout
```text
framework/
  config_loader.py
  models.py
  planner.py
  runner_context.py
  assertions.py
  adapters/
    base.py
    registry.py
    sqlite_adapter.py
config/
  tests.yaml
tests/
  test_data_quality.py
scripts/
  seed_demo_db.py
```

## CI usage
```bash
pytest -q --junitxml=reports/junit.xml -m "critical or high"
```

## Notes
- Default adapter is SQLite for local runnable demo.
- Add Snowflake/BigQuery/Databricks adapters by implementing `DBAdapter`.

## AI-assisted triage (OpenAI-compatible)
The framework can enrich assertion failures with AI debugging hints.

Enable in `config/tests.yaml`:
```yaml
ai:
  enabled: true
  model: gpt-4o-mini
  base_url: https://api.openai.com/v1
```

Set key:
```bash
export OPENAI_API_KEY=... 
```

On failure, output includes:
- likely root causes
- immediate debugging SQL checks
- suggested fix plan

If AI is disabled or key is missing, tests still run normally.

## AI Agent (LangChain + LangGraph)
This starter now includes an ETL Test AI Agent that can:
- plan test scope from user intent
- execute pytest suites
- analyze failures with OpenAI-compatible LLM
- output remediation notes

### Run agent
```bash
cd /home/vnc/.openclaw/workspace/projects/etl-testing-framework
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY=your_key
python -m agent.run_agent --request "run critical ETL checks and provide remediation"
```

Output artifacts:
- `reports/junit.xml`
- `reports/ai_remediation.md`

## Auto-generate tests from schema + lineage
Generate additional checks from table schemas and `config/lineage.yaml`:

```bash
PYTHONPATH=. python -m agent.generate_tests
```

Output:
- `agent/generated/generated_tests.yaml`

Includes generated checks for:
- schema baseline
- PK uniqueness
- not-null constraints
- freshness heuristics
- lineage rowcount reconciliation
- lineage orphan/integrity checks

### Severity ranking by business impact + table tier
Generated tests are now auto-ranked (`critical`/`high`) using:
- `config/table_tiers.yaml` (Tier 1/2/3)
- `business_impact_weights` per test category

Tune ranking by editing:
- `config/table_tiers.yaml`

## MCP server
This project includes an MCP server to expose ETL testing operations as tools.

### Start server
```bash
cd /home/vnc/.openclaw/workspace/projects/etl-testing-framework
source .venv/bin/activate
pip install -r requirements.txt
python -m mcp_server.server
```

### Exposed MCP tools
- `health`
- `run_etl_tests(mark_expr?)`
- `generate_tests_from_metadata()`
- `run_ai_agent(request)`
- `show_suite_config()`
