from fastapi.testclient import TestClient
from app.api.server import app


def test_v3_telemetry_endpoint():
    c = TestClient(app)
    r = c.get('/v3/telemetry', headers={'X-API-Key':'viewer-token'})
    assert r.status_code == 200
    assert 'runs' in r.json()


def test_v3_remediation_flow():
    c = TestClient(app)
    findings = [{"domain":"functional","check_id":"w1","status":"FAIL"}]
    p = c.post('/v3/remediation/propose', headers={'X-API-Key':'viewer-token'}, json={'findings': findings})
    assert p.status_code == 200
    actions = p.json()['actions']
    a = c.post('/v3/remediation/apply', headers={'X-API-Key':'operator-token'}, json={'actions': actions, 'approved': True})
    assert a.status_code == 200
    assert a.json()['status'] == 'APPLIED'
