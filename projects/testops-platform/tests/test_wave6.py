from fastapi.testclient import TestClient

from app.api.server import app


def test_wave6_compliance_endpoints():
    c = TestClient(app)
    h = {"X-API-Key": "viewer-token"}

    controls = c.post('/wave6/compliance/controls', headers=h, json={"features": {"rbac": True, "jwt_auth": True}})
    assert controls.status_code == 200
    assert controls.json()["total_controls"] >= 1

    retention = c.get('/wave6/compliance/audit-retention', headers=h)
    assert retention.status_code == 200
    assert retention.json()["policy_documented"] is True

    pii = c.post('/wave6/compliance/pii-mask/validate', headers=h, json={"sample": {"email": "a@b.com", "ssn": "123-45-6789"}})
    assert pii.status_code == 200
    body = pii.json()
    assert body["pii_detected"] is True
    assert "***EMAIL***" in str(body["masked_payload"])


def test_wave6_sso_scim_endpoints():
    c = TestClient(app)
    viewer = {"X-API-Key": "viewer-token"}
    operator = {"X-API-Key": "operator-token"}

    sso = c.get('/wave6/sso/status', headers=viewer)
    assert sso.status_code == 200
    assert "checks" in sso.json()

    created = c.post('/wave6/scim/users', headers=operator, json={"user": {"id": "u-test", "userName": "u@test.local", "active": True}, "actor": "pytest"})
    assert created.status_code == 200
    assert created.json()["ok"] is True

    updated = c.put('/wave6/scim/users/u-test', headers=operator, json={"updates": {"displayName": "Test User"}, "actor": "pytest"})
    assert updated.status_code == 200
    assert updated.json()["user"]["displayName"] == "Test User"

    deactivated = c.post('/wave6/scim/users/u-test/deactivate', headers=operator, json={"actor": "pytest"})
    assert deactivated.status_code == 200
    assert deactivated.json()["user"]["active"] is False

    listed = c.get('/wave6/scim/users', headers=viewer)
    assert listed.status_code == 200
    assert any(u.get("id") == "u-test" for u in listed.json()["users"])


def test_wave6_ha_dr_and_cost_governance(monkeypatch):
    class _Resp:
        status_code = 200

    monkeypatch.setattr('app.wave5.alerts.requests.post', lambda *args, **kwargs: _Resp())

    c = TestClient(app)
    viewer = {"X-API-Key": "viewer-token"}
    operator = {"X-API-Key": "operator-token"}

    drill = c.post('/wave6/ha-dr/drill/run', headers=operator, json={"label": "pytest"})
    assert drill.status_code == 200
    assert drill.json()["ok"] is True

    latest = c.get('/wave6/ha-dr/drill/latest', headers=viewer)
    assert latest.status_code == 200
    assert latest.json()["ok"] is True

    budget = c.post('/wave6/cost/policies', headers=operator, json={"scope": "agent:playwright", "daily_limit": 100, "warning_threshold": 0.8})
    assert budget.status_code == 200
    assert budget.json()["ok"] is True

    usage = c.post('/wave6/cost/usage/track', headers=operator, json={"scope": "agent:playwright", "amount": 85, "meta": {"run": "pytest"}})
    assert usage.status_code == 200
    assert usage.json()["decision"]["warn"] is True

    throttle = c.get('/wave6/cost/throttle/agent:playwright', headers=viewer)
    assert throttle.status_code == 200
    assert throttle.json()["usage_ratio"] >= 0.8
