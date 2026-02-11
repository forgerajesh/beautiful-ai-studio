import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

from fastapi.testclient import TestClient

from app.api.server import app


class _Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/health'):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'ok')
            return
        if self.path.startswith('/api/profile'):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{}')
            return
        if self.path.startswith('/api/admin'):
            auth = self.headers.get('Authorization', '')
            if auth == 'Bearer good-token':
                self.send_response(200)
            else:
                self.send_response(403)
            self.end_headers()
            return
        self.send_response(404)
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/login'):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{}')
            return
        self.send_response(404)
        self.end_headers()

    def log_message(self, *args, **kwargs):
        return


def _start_server():
    server = HTTPServer(('127.0.0.1', 0), _Handler)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server


def test_wave4_contract_drift_fuzz_soak_and_reports():
    c = TestClient(app)
    v = {'X-API-Key': 'viewer-token'}
    op = {'X-API-Key': 'operator-token'}

    server = _start_server()
    base = f'http://127.0.0.1:{server.server_port}'

    contract_file = Path('requirements/sample-contract-wave4.json')
    contract_file.write_text(json.dumps({
        'name': 'wave4-contract',
        'version': '1.0',
        'provider': 'local',
        'consumer': 'test',
        'endpoints': [
            {'method': 'POST', 'path': '/api/login', 'expected_status': 200},
            {'method': 'GET', 'path': '/api/profile', 'expected_status': 200},
        ],
    }))

    r1 = c.post('/wave4/contract/execute', headers=v, json={'contract_path': str(contract_file), 'provider_base_url': base})
    assert r1.status_code == 200
    assert r1.json()['ok'] is True

    r2 = c.post('/wave4/drift/analyze', headers=v, json={
        'baseline': [{'amount': 10, 'status': 'ok'}, {'amount': 12, 'status': 'ok'}],
        'current': [{'amount': 30, 'status': 'error'}, {'amount': 35, 'status': 'error'}],
        'numeric_fields': ['amount'],
        'categorical_fields': ['status'],
    })
    assert r2.status_code == 200
    assert 'id' in r2.json()

    dr = c.get('/wave4/drift/reports', headers=v)
    assert dr.status_code == 200
    assert len(dr.json()['reports']) >= 1

    fz = c.post('/wave4/security/fuzz', headers=op, json={
        'target_base_url': base,
        'path': '/health',
        'method': 'GET',
        'auth_header': 'Bearer good-token',
    })
    assert fz.status_code == 200
    assert 'summary' in fz.json()

    fr = c.get('/wave4/security/fuzz/reports', headers=v)
    assert fr.status_code == 200
    assert len(fr.json()['reports']) >= 1

    sk = c.post('/wave4/performance/soak', headers=op, json={'duration_seconds': 1, 'interval_ms': 10, 'jitter_ms': 1})
    assert sk.status_code == 200
    assert sk.json()['percentiles_ms']['p95'] >= sk.json()['percentiles_ms']['p50']

    sr = c.get('/wave4/performance/soak/reports', headers=v)
    assert sr.status_code == 200
    assert len(sr.json()['reports']) >= 1

    server.shutdown()


def test_channels_send_native_slack_discord(monkeypatch):
    c = TestClient(app)
    op = {'X-API-Key': 'operator-token'}

    def fake_post(*args, **kwargs):
        class R:
            status_code = 200
            text = 'ok'

            def json(self):
                return {'ok': True, 'ts': '1'}

        return R()

    monkeypatch.setattr('app.channels.slack.requests.post', fake_post)
    monkeypatch.setattr('app.channels.discord.requests.post', fake_post)

    s = c.post('/channels/send', headers=op, json={'channel': 'slack', 'chat_id': 'C1', 'text': 'hello'})
    assert s.status_code == 200
    assert s.json()['ok'] is True

    d = c.post('/channels/send', headers=op, json={'channel': 'discord', 'chat_id': '123', 'text': 'hello'})
    assert d.status_code == 200
    assert d.json()['ok'] is True
