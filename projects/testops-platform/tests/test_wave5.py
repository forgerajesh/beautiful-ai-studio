from fastapi.testclient import TestClient

from app.api.server import app


def test_wave5_mobile_cloud_simulate_and_report():
    c = TestClient(app)
    h = {"X-API-Key": "operator-token"}
    r = c.post('/wave5/mobile/cloud-run', headers=h, json={"provider": "browserstack", "simulate": True, "device": "Pixel 7"})
    assert r.status_code == 200
    body = r.json()
    assert body["ok"] is True
    assert body["mode"] == "simulate"

    last = c.get('/wave5/mobile/cloud-last-report', headers={"X-API-Key": "viewer-token"})
    assert last.status_code == 200
    assert last.json()["provider"] == "browserstack"


def test_wave5_secrets_status_env_provider(monkeypatch):
    monkeypatch.setenv('WAVE5_SECRET_PROVIDER', 'env')
    c = TestClient(app)
    r = c.get('/wave5/secrets/status', headers={"X-API-Key": "viewer-token"})
    assert r.status_code == 200
    assert r.json()["provider"] == "env"
    assert r.json()["healthy"] is True


def test_wave5_backup_run_and_list():
    c = TestClient(app)
    run = c.post('/wave5/backup/run', headers={"X-API-Key": "operator-token"}, json={"label": "pytest"})
    assert run.status_code == 200
    assert run.json()["ok"] is True

    rows = c.get('/wave5/backup/list', headers={"X-API-Key": "viewer-token"})
    assert rows.status_code == 200
    assert len(rows.json()["backups"]) >= 1


def test_wave5_alert_test_and_send(monkeypatch):
    class _Resp:
        status_code = 200

    monkeypatch.setattr('app.wave5.alerts.requests.post', lambda *args, **kwargs: _Resp())
    c = TestClient(app)

    t = c.post('/wave5/alerts/test', headers={"X-API-Key": "viewer-token"}, json={"channel": "webhook", "webhook_url": "https://example.com/h"})
    assert t.status_code == 200
    assert t.json()["ok"] is True

    s = c.post('/wave5/alerts/send', headers={"X-API-Key": "operator-token"}, json={"channel": "webhook", "payload": {"summary": "x", "webhook_url": "https://example.com/h"}})
    assert s.status_code == 200
    assert s.json()["ok"] is True


def test_gate_block_triggers_wave5_alert(monkeypatch):
    class _Resp:
        status_code = 200

    monkeypatch.setattr('app.wave5.alerts.requests.post', lambda *args, **kwargs: _Resp())
    c = TestClient(app)
    r = c.post('/wave3.2/promotion/evaluate', headers={"X-API-Key": "viewer-token"}, json={"from": "qa", "to": "prod", "counts": {"fail": 1, "error": 0}})
    assert r.status_code == 200
    body = r.json()
    assert body["decision"] == "BLOCK"
    assert "wave5_alert" in body


def test_channels_send_whatsapp_and_signal(monkeypatch):
    class _Resp:
        status_code = 200
        text = '{}'

        def json(self):
            return {"ok": True}

    monkeypatch.setattr('app.channels.whatsapp.requests.post', lambda *args, **kwargs: _Resp())
    monkeypatch.setattr('app.channels.signal.requests.post', lambda *args, **kwargs: _Resp())

    c = TestClient(app)

    wa = c.post('/channels/send', headers={"X-API-Key": "operator-token"}, json={
        "channel": "whatsapp",
        "chat_id": "15550001111",
        "text": "hello",
        "config_path": "config/product.yaml",
    })
    assert wa.status_code == 200

    sg = c.post('/channels/send', headers={"X-API-Key": "operator-token"}, json={
        "channel": "signal",
        "chat_id": "+15550001111",
        "text": "hello",
        "config_path": "config/product.yaml",
    })
    assert sg.status_code == 200
