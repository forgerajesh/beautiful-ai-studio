from fastapi.testclient import TestClient

from app.api.server import app
from app.etl.engine import run_etl_profile


def test_etl_core_checks_generate_report():
    report = run_etl_profile("retail_orders")
    assert report["ok"] is True
    assert report["profile"] == "retail_orders"
    assert report["summary"]["total_checks"] >= 6
    names = {c["name"] for c in report["checks"]}
    assert "schema_validation_source" in names
    assert "rowcount_reconciliation" in names


def test_etl_endpoints():
    client = TestClient(app)
    viewer = {"X-API-Key": "viewer-token"}
    operator = {"X-API-Key": "operator-token"}

    profiles = client.get("/etl/profiles", headers=viewer)
    assert profiles.status_code == 200
    assert len(profiles.json().get("profiles", [])) >= 1

    run = client.post("/etl/run", headers=operator, json={"profile": "retail_orders"})
    assert run.status_code == 200
    assert run.json()["status"] in ("PASS", "FAIL")

    last = client.get("/etl/last-report", headers=viewer)
    assert last.status_code == 200
    assert "summary" in last.json()
