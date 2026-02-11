import json
from pathlib import Path
from urllib.parse import urljoin
import requests


def _load_contract(contract_path: str):
    p = Path(contract_path)
    if not p.exists():
        return None, {"ok": False, "error": f"contract file not found: {contract_path}"}
    try:
        return json.loads(p.read_text()), None
    except Exception as e:
        return None, {"ok": False, "error": f"invalid contract json: {e}"}


def execute_contract(contract_path: str, provider_base_url: str = "", timeout_s: int = 10):
    contract, err = _load_contract(contract_path)
    if err:
        return err

    base_url = provider_base_url or contract.get("provider_base_url") or ""
    if not base_url:
        return {"ok": False, "error": "provider_base_url is required (payload or contract field)"}

    results = []
    for ep in contract.get("endpoints", []):
        method = str(ep.get("method", "GET")).upper()
        path = str(ep.get("path", "/"))
        expected_status = int(ep.get("expected_status", 200))
        body = ep.get("body")
        headers = ep.get("headers") or {}

        url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
        try:
            r = requests.request(method, url, json=body, headers=headers, timeout=timeout_s)
            ok = r.status_code == expected_status
            results.append(
                {
                    "method": method,
                    "path": path,
                    "url": url,
                    "expected_status": expected_status,
                    "actual_status": r.status_code,
                    "ok": ok,
                }
            )
        except Exception as e:
            results.append(
                {
                    "method": method,
                    "path": path,
                    "url": url,
                    "expected_status": expected_status,
                    "actual_status": None,
                    "ok": False,
                    "error": str(e),
                }
            )

    pass_count = len([x for x in results if x.get("ok")])
    return {
        "ok": pass_count == len(results),
        "contract": contract.get("name", contract_path),
        "provider_base_url": base_url,
        "summary": {"total": len(results), "pass": pass_count, "fail": len(results) - pass_count},
        "results": results,
    }
