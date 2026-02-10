from fastapi.testclient import TestClient
from app.api.server import app


def test_wave3_synthesis_and_analytics():
    c = TestClient(app)
    h = {'X-API-Key': 'viewer-token'}

    s = c.post('/wave3/synthesis/pr-diff', headers=h, json={'pr_diff': 'diff --git a/ui-react/src/App.jsx b/ui-react/src/App.jsx'})
    assert s.status_code == 200
    assert s.json().get('ok') is True

    e = c.get('/wave3/analytics/executive', headers=h)
    assert e.status_code == 200
    assert 'kpi' in e.json()


def test_wave3_hitl_flow():
    c = TestClient(app)
    op = {'X-API-Key': 'operator-token'}
    v = {'X-API-Key': 'viewer-token'}

    cr = c.post('/wave3/remediation/checkpoint/create', headers=op, json={'title': 'Approve remediation', 'actions': [{'target':'workflow:login'}], 'created_by':'raj'})
    assert cr.status_code == 200
    cid = cr.json()['id']

    ap = c.post('/wave3/remediation/checkpoint/approve', headers=op, json={'checkpoint_id': cid, 'actor': 'lead'})
    assert ap.status_code == 200
    assert ap.json()['checkpoint']['status'] == 'APPROVED'

    ls = c.get('/wave3/remediation/checkpoint/list', headers=v)
    assert ls.status_code == 200
    assert isinstance(ls.json().get('checkpoints'), list)
