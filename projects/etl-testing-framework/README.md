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
