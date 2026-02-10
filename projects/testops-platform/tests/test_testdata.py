from fastapi.testclient import TestClient
from app.api.server import app


def test_testdata_flow():
    c = TestClient(app)
    op = {'X-API-Key': 'operator-token'}
    vw = {'X-API-Key': 'viewer-token'}

    s = c.post('/testdata/seed', headers=op, json={'profile': 'demo'})
    assert s.status_code == 200

    g = c.post('/testdata/generate', headers=op, json={'profile': 'demo', 'users': 5, 'orders': 7})
    assert g.status_code == 200

    l = c.post('/testdata/load', headers=vw, json={'profile': 'demo'})
    assert l.status_code == 200
    assert l.json().get('ok') is True

    st = c.get('/testdata/status', headers=vw)
    assert st.status_code == 200
    assert st.json().get('active_profile') == 'demo'

    r = c.post('/testdata/reset', headers=op)
    assert r.status_code == 200
