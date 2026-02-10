import os
from pathlib import Path


def run_doctor():
    checks = []

    checks.append({"name": "reports_dir", "ok": Path("reports").exists(), "hint": "Run a suite once to generate reports."})
    checks.append({"name": "artifacts_dir", "ok": Path("artifacts").exists(), "hint": "Generate artifacts via /artifacts/generate."})
    checks.append({"name": "redis_url_configured", "ok": bool(os.getenv("REDIS_URL")), "hint": "Set REDIS_URL for distributed worker backend."})
    checks.append({"name": "otel_endpoint_configured", "ok": bool(os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")), "hint": "Set OTEL_EXPORTER_OTLP_ENDPOINT for telemetry export."})
    checks.append({"name": "jira_configured", "ok": all(bool(os.getenv(k)) for k in ["JIRA_BASE_URL", "JIRA_USER_EMAIL", "JIRA_API_TOKEN", "JIRA_PROJECT_KEY"]), "hint": "Set Jira env vars for issue sync."})
    checks.append({"name": "testrail_configured", "ok": all(bool(os.getenv(k)) for k in ["TESTRAIL_BASE_URL", "TESTRAIL_USER_EMAIL", "TESTRAIL_API_KEY", "TESTRAIL_PROJECT_ID"]), "hint": "Set TestRail env vars for run/results sync."})
    checks.append({"name": "etl_profiles_config", "ok": Path("etl/profiles.yaml").exists(), "hint": "Ensure etl/profiles.yaml exists with at least one profile."})
    checks.append({"name": "etl_sample_data", "ok": Path("etl/source_orders.csv").exists() and Path("etl/target_orders.csv").exists(), "hint": "Provide ETL source and target CSV samples under etl/."})

    ok = all(c["ok"] for c in checks)
    return {"ok": ok, "checks": checks}
