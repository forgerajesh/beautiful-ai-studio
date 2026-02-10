from fastapi.testclient import TestClient
from app.api.server import app


def test_ui_home_loads():
    c = TestClient(app)
    r = c.get("/")
    assert r.status_code == 200
    assert "TestOps One-Stop Testing Platform" in r.text
