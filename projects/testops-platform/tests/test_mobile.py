from fastapi.testclient import TestClient
from app.api.server import app


def test_mobile_endpoints():
    c = TestClient(app)
    v = {'X-API-Key': 'viewer-token'}
    op = {'X-API-Key': 'operator-token'}

    d = c.get('/mobile/devices', headers=v)
    assert d.status_code == 200
    assert len(d.json().get('devices', [])) > 0

    r = c.post('/mobile/run', headers=op, json={'url': 'https://example.com', 'device': 'iPhone 13', 'simulate': True})
    assert r.status_code == 200
    assert r.json().get('ok') is True

    l = c.get('/mobile/last-report', headers=v)
    assert l.status_code == 200
    assert l.json().get('ok') is True
