from fastapi.testclient import TestClient
from app.api.server import app


def test_doctor_and_artifacts_endpoints():
    c = TestClient(app)
    h = {'X-API-Key': 'viewer-token'}

    d = c.get('/doctor', headers=h)
    assert d.status_code == 200
    assert 'checks' in d.json()

    l = c.get('/artifacts/list', headers=h)
    assert l.status_code == 200
    assert 'files' in l.json()

    files = l.json().get('files') or []
    if files:
      r = c.post('/artifacts/read', headers=h, json={'path': files[0]})
      assert r.status_code == 200
      assert r.json().get('ok') is True
