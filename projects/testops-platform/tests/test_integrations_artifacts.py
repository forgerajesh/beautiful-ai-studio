from fastapi.testclient import TestClient
from app.api.server import app


def test_generate_artifacts_endpoint():
    c = TestClient(app)
    r = c.post('/artifacts/generate', headers={'X-API-Key':'viewer-token'}, json={'product_name':'MyProduct'})
    assert r.status_code == 200
    data = r.json()
    assert data['ok'] is True
    assert 'testplan' in data['files']
