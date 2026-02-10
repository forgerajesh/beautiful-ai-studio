from fastapi.testclient import TestClient
from app.api.server import app


def test_rbac_blocks_without_key():
    c = TestClient(app)
    r = c.get('/channels')
    assert r.status_code == 401


def test_tenant_config_roundtrip():
    c = TestClient(app)
    admin = {"X-API-Key": "admin-token"}
    viewer = {"X-API-Key": "viewer-token"}

    payload = {
        "channels": {
            "telegram": {"enabled": True, "bot_token": "abc", "chat_id": "123"}
        }
    }
    w = c.put('/tenants/acme/channels', headers=admin, json=payload)
    assert w.status_code == 200

    r = c.get('/tenants/acme/channels', headers=viewer)
    assert r.status_code == 200
    assert r.json()["config"]["channels"]["telegram"]["chat_id"] == "123"
