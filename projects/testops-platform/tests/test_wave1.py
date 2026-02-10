from fastapi.testclient import TestClient
import jwt

from app.api.server import app


def test_wave1_otel_status():
    c = TestClient(app)
    r = c.get('/wave1/otel/status', headers={'X-API-Key': 'viewer-token'})
    assert r.status_code == 200
    assert 'enabled' in r.json()


def test_wave1_jwt_verify():
    c = TestClient(app)
    token = jwt.encode({'sub': 'raj', 'role': 'admin'}, 'dev-secret', algorithm='HS256')
    r = c.get('/wave1/auth/jwt/verify', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    assert r.json()['role'] == 'admin'
