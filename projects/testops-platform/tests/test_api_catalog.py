from fastapi.testclient import TestClient
from app.api.server import app


def test_catalog_endpoints():
    c = TestClient(app)
    assert c.get('/channels').status_code == 200
    assert c.get('/agents').status_code == 200
    assert c.get('/workflows').status_code == 200
