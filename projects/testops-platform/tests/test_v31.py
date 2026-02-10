from fastapi.testclient import TestClient
from app.api.server import app


def test_v31_queue_status():
    c = TestClient(app)
    r = c.get('/v3.1/queue/status', headers={'X-API-Key':'viewer-token'})
    assert r.status_code == 200
    assert 'backend' in r.json()


def test_v31_metrics_and_audit():
    c = TestClient(app)
    h_view = {'X-API-Key':'viewer-token'}
    h_op = {'X-API-Key':'operator-token'}

    m = c.get('/v3.1/metrics', headers=h_view)
    assert m.status_code == 200
    assert 'testops_runs_total' in m.text

    a = c.post('/v3.1/remediation/apply', headers=h_op, json={'actions':[{'target':'x'}], 'approved': True, 'actor':'raj'})
    assert a.status_code == 200

    l = c.get('/v3.1/audit', headers=h_view)
    assert l.status_code == 200
    assert 'events' in l.json()
