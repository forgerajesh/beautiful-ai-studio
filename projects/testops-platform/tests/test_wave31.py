from fastapi.testclient import TestClient
from app.api.server import app


def test_wave31_contract_validate():
    c = TestClient(app)
    h = {'X-API-Key': 'viewer-token'}
    r = c.post('/wave3.1/contract/validate', headers=h, json={'contract_path': 'requirements/sample-contract.json'})
    assert r.status_code == 200
    assert r.json()['ok'] is True


def test_wave31_traceability_build():
    c = TestClient(app)
    h = {'X-API-Key': 'viewer-token'}
    r = c.post('/wave3.1/traceability/build', headers=h, json={
        'requirements_path': 'requirements/requirements.json',
        'tests_path': 'artifacts/TESTCASES.md'
    })
    assert r.status_code == 200
    assert 'coverage' in r.json()
