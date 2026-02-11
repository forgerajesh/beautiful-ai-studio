from pathlib import Path

from fastapi.testclient import TestClient

from app.api.server import app
import app.qa_lifecycle.service as lifecycle_service


def test_qa_lifecycle_api_flow(tmp_path):
    lifecycle_service.REQ_STORE = tmp_path / "requirements-store.json"
    lifecycle_service.RUN_STORE = tmp_path / "qa-lifecycle-runs.json"

    c = TestClient(app)
    op = {"X-API-Key": "operator-token"}
    viewer = {"X-API-Key": "viewer-token"}

    created = c.post(
        "/qa-lifecycle/requirements",
        headers=op,
        json={"title": "Checkout should complete in 2 sec", "risk": "high", "domain": "functional"},
    )
    assert created.status_code == 200
    req = created.json()["requirement"]
    req_id = req["id"]

    updated = c.put(f"/qa-lifecycle/requirements/{req_id}", headers=op, json={"status": "approved"})
    assert updated.status_code == 200
    assert updated.json()["requirement"]["version"] == 2

    versions = c.get(f"/qa-lifecycle/requirements/{req_id}/versions", headers=viewer)
    assert versions.status_code == 200
    assert len(versions.json()["versions"]) >= 2

    reqs = c.get("/qa-lifecycle/requirements", headers=viewer).json()["requirements"]
    strategy = c.post("/qa-lifecycle/strategy", headers=viewer, json={"requirements": reqs}).json()
    design = c.post("/qa-lifecycle/design", headers=viewer, json={"requirements": reqs, "strategy": strategy}).json()
    cases = c.post("/qa-lifecycle/test-cases", headers=viewer, json={"requirements": reqs, "strategy": strategy, "design": design}).json()
    plan = c.post("/qa-lifecycle/test-plan", headers=viewer, json={"requirements": reqs, "test_cases": cases}).json()
    types = c.post("/qa-lifecycle/testing-types", headers=viewer, json={"requirements": reqs, "test_cases": cases}).json()
    execution = c.post("/qa-lifecycle/execute", headers=op, json={"suites": ["functional", "security"]}).json()
    state = c.post("/qa-lifecycle/state", headers=viewer, json={"requirements": reqs, "run": {"execution": execution}}).json()

    assert strategy.get("strategy", {}).get("approach") == "risk-based"
    assert design.get("total_scenarios", 0) > 0
    assert len(cases.get("test_cases", [])) > 0
    assert plan.get("scope", {}).get("test_case_count", 0) > 0
    assert "functional" in types.get("mapping", {})
    assert execution.get("status") == "triggered"
    assert state.get("plan_status") == "ready"


def test_qa_lifecycle_ui_dataflow_save_and_reload(tmp_path):
    lifecycle_service.REQ_STORE = tmp_path / "requirements-store.json"
    lifecycle_service.RUN_STORE = tmp_path / "qa-lifecycle-runs.json"

    c = TestClient(app)
    op = {"X-API-Key": "operator-token"}
    viewer = {"X-API-Key": "viewer-token"}

    req = c.post("/qa-lifecycle/requirements", headers=op, json={"title": "ETL pipeline should reconcile counts", "domain": "etl", "risk": "medium"}).json()["requirement"]

    payload = {
        "run_id": "LIFE-UI-001",
        "requirements": [req],
        "strategy": {"strategy": {"approach": "risk-based"}},
        "design": {"scenario_matrix": [{"requirement_id": req["id"], "scenario": "happy_path"}]},
        "test_cases": {"test_cases": [{"id": "TC-0001", "requirement_id": req["id"]}]},
        "plan": {"scope": {"requirements": [req["id"]]}},
        "types_mapping": {"mapping": {"etl": [req["id"]]}},
        "execution": {"status": "triggered"},
    }

    saved = c.post("/qa-lifecycle/runs", headers=op, json=payload)
    assert saved.status_code == 200
    assert saved.json()["run"]["run_id"] == "LIFE-UI-001"

    listed = c.get("/qa-lifecycle/runs", headers=viewer)
    assert listed.status_code == 200
    assert any(r["run_id"] == "LIFE-UI-001" for r in listed.json()["runs"])

    loaded = c.get("/qa-lifecycle/runs/LIFE-UI-001", headers=viewer)
    assert loaded.status_code == 200
    assert loaded.json()["run"]["requirements"][0]["id"] == req["id"]

    jira = c.post("/qa-lifecycle/push/jira", headers=op, json={"summary": "Lifecycle review"})
    testrail = c.post("/qa-lifecycle/push/testrail", headers=op, json={"name": "Lifecycle run"})
    assert jira.status_code == 200
    assert testrail.status_code == 200
