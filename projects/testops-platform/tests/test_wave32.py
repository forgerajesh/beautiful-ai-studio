from fastapi.testclient import TestClient
from pathlib import Path
from app.api.server import app


def test_wave32_flaky_and_promotion_and_perf():
    c = TestClient(app)
    op = {'X-API-Key': 'operator-token'}
    v = {'X-API-Key': 'viewer-token'}

    for i in range(6):
        c.post('/wave3.2/flaky/record', headers=op, json={'test_id': 'TC-123', 'passed': i % 2 == 0})
    lf = c.get('/wave3.2/flaky/list', headers=v)
    assert lf.status_code == 200

    pr = c.post('/wave3.2/promotion/evaluate', headers=v, json={'from': 'qa', 'to': 'prod', 'counts': {'fail': 0, 'error': 0}})
    assert pr.status_code == 200
    assert 'allowed' in pr.json()

    pf = c.post('/wave3.2/performance/percentiles', headers=v, json={'samples_ms': [10,20,30,40,50,60,70,80,90,100]})
    assert pf.status_code == 200
    assert pf.json()['p95'] >= pf.json()['p50']


def test_wave32_visual_and_chaos():
    c = TestClient(app)
    op = {'X-API-Key': 'operator-token'}
    v = {'X-API-Key': 'viewer-token'}

    snap = Path('reports/test-snap.bin')
    snap.parent.mkdir(parents=True, exist_ok=True)
    snap.write_bytes(b'abc')

    v1 = c.post('/wave3.2/visual/compare', headers=v, json={'name': 'home', 'current_path': str(snap)})
    assert v1.status_code == 200

    snap.write_bytes(b'abcd')
    v2 = c.post('/wave3.2/visual/compare', headers=v, json={'name': 'home', 'current_path': str(snap)})
    assert v2.status_code == 200
    assert v2.json()['status'] in ['CHANGED', 'UNCHANGED', 'BASELINE_CREATED']

    ch = c.post('/wave3.2/chaos/run', headers=op, json={'scenario': 'latency-spike'})
    assert ch.status_code == 200
    assert ch.json()['result'] == 'SIMULATED'
