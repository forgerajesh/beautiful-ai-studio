from fastapi.testclient import TestClient
from app.api.server import app


def test_catalog_endpoints():
    c = TestClient(app)
    h = {"X-API-Key": "viewer-token"}
    assert c.get('/channels', headers=h).status_code == 200
    assert c.get('/agents', headers=h).status_code == 200
    assert c.get('/workflows', headers=h).status_code == 200
    assert c.get('/etl/profiles', headers=h).status_code == 200
