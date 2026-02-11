import jwt
from fastapi.testclient import TestClient

from app.api.server import app


def test_wave41_auth_status_and_verify_hs256(monkeypatch):
    monkeypatch.setenv('JWT_AUTH_MODE', 'auto')
    monkeypatch.delenv('OIDC_JWKS_URL', raising=False)
    monkeypatch.delenv('OIDC_ISSUER_URL', raising=False)

    c = TestClient(app)
    h = {'X-API-Key': 'viewer-token'}
    s = c.get('/wave4.1/auth/status', headers=h)
    assert s.status_code == 200
    assert s.json()['active_mode'] == 'hs256'

    token = jwt.encode({'sub': 'raj', 'role': 'operator'}, 'dev-secret', algorithm='HS256')
    v = c.get('/wave4.1/auth/verify', headers={'Authorization': f'Bearer {token}'})
    assert v.status_code == 200
    assert v.json()['role'] == 'operator'


def test_wave41_policy_opa_and_fallback(monkeypatch):
    c = TestClient(app)
    h = {'X-API-Key': 'viewer-token'}

    monkeypatch.delenv('OPA_POLICY_URL', raising=False)
    local = c.post('/wave4.1/policy/evaluate', headers=h, json={'counts': {'fail': 0, 'error': 0}})
    assert local.status_code == 200
    assert local.json()['adapter'] == 'local'

    class _Resp:
        def raise_for_status(self):
            return None

        def json(self):
            return {'result': {'allow': True, 'violations': []}}

    def _ok_post(*args, **kwargs):
        return _Resp()

    monkeypatch.setenv('OPA_POLICY_URL', 'http://opa/v1/data/testops/allow')
    monkeypatch.setattr('app.wave41.policy.adapter.requests.post', _ok_post)
    opa = c.post('/wave4.1/policy/evaluate', headers=h, json={'counts': {'fail': 9, 'error': 1}})
    assert opa.status_code == 200
    assert opa.json()['adapter'] == 'opa'
    assert opa.json()['decision'] == 'ALLOW'


def test_wave41_queue_and_teams_send(monkeypatch):
    c = TestClient(app)
    h = {'X-API-Key': 'viewer-token'}

    monkeypatch.delenv('REDIS_URL', raising=False)
    q = c.get('/wave4.1/queue/readiness', headers=h)
    assert q.status_code == 200
    assert q.json()['ready'] is True

    class _TeamsResp:
        status_code = 200
        text = '1'

    monkeypatch.setattr('app.channels.teams.requests.post', lambda *args, **kwargs: _TeamsResp())
    monkeypatch.setenv('OPA_POLICY_URL', '')

    sent = c.post(
        '/channels/send',
        headers={'X-API-Key': 'operator-token'},
        json={'channel': 'teams', 'chat_id': 'https://teams.example/webhook', 'text': 'hello'},
    )
    assert sent.status_code == 200
    assert sent.json()['ok'] is True
