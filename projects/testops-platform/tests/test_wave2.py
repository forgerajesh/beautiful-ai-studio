from fastapi.testclient import TestClient
from app.api.server import app


def test_wave2_policy_and_risk():
    c = TestClient(app)
    h = {'X-API-Key': 'viewer-token'}
    p = c.post('/wave2/policy/evaluate', headers=h, json={'counts': {'fail': 0, 'error': 0}, 'critical_security_failures': 0})
    assert p.status_code == 200
    assert p.json()['decision'] in ['ALLOW', 'DENY']

    r = c.post('/wave2/risk/select-agents', headers=h, json={'changed_files': ['src/api/user_service.py', 'ui-react/src/App.jsx']})
    assert r.status_code == 200
    assert 'agents' in r.json()


def test_wave2_approval_workflow():
    c = TestClient(app)
    op = {'X-API-Key': 'operator-token'}
    v = {'X-API-Key': 'viewer-token'}

    req = c.post('/wave2/approval/request', headers=op, json={'title': 'Release override', 'payload': {'release': '1.2.3'}, 'requested_by': 'raj'})
    assert req.status_code == 200
    rid = req.json()['id']

    a1 = c.post('/wave2/approval/approve', headers=op, json={'request_id': rid, 'actor': 'alice'})
    assert a1.status_code == 200
    a2 = c.post('/wave2/approval/approve', headers=op, json={'request_id': rid, 'actor': 'bob'})
    assert a2.status_code == 200
    assert a2.json()['request']['status'] == 'APPROVED'

    lst = c.get('/wave2/approval/list', headers=v)
    assert lst.status_code == 200
    assert isinstance(lst.json().get('requests'), list)
