import json
from datetime import datetime, UTC
from pathlib import Path
import requests

DB = Path("reports/wave4-fuzz-reports.json")


def _load_db():
    if not DB.exists():
        return []
    try:
        return json.loads(DB.read_text())
    except Exception:
        return []


def _persist(report):
    rows = _load_db()
    rows.append(report)
    DB.parent.mkdir(parents=True, exist_ok=True)
    DB.write_text(json.dumps(rows[-200:], indent=2), encoding="utf-8")
    return report


def run_fuzz(target_base_url: str, path: str = "/", method: str = "GET", auth_header: str = ""):
    method = method.upper()
    findings = []

    cases = [
        ("path_traversal", f"{path}../../etc/passwd", None, None),
        ("query_injection", path, {"q": "' OR 1=1 --"}, None),
        ("body_xss", path, None, {"input": "<script>alert(1)</script>"}),
    ]

    for name, cpath, query, body in cases:
        try:
            r = requests.request(method, target_base_url.rstrip("/") + cpath, params=query, json=body, timeout=8)
            if r.status_code >= 500:
                findings.append({"type": name, "severity": "medium", "detail": f"5xx from payload: {r.status_code}"})
        except Exception as e:
            findings.append({"type": name, "severity": "medium", "detail": str(e)})

    # authz smoke: compare anonymous vs auth call to protected path
    protected_path = "/api/admin"
    try:
        r_anon = requests.get(target_base_url.rstrip("/") + protected_path, timeout=8)
        headers = {"Authorization": auth_header} if auth_header else {}
        r_auth = requests.get(target_base_url.rstrip("/") + protected_path, headers=headers, timeout=8)
        if r_anon.status_code == 200:
            findings.append({"type": "authz_matrix", "severity": "high", "detail": "anonymous can access /api/admin"})
        if auth_header and r_auth.status_code in (401, 403):
            findings.append({"type": "authz_matrix", "severity": "low", "detail": "provided auth token did not unlock /api/admin"})
    except Exception as e:
        findings.append({"type": "authz_matrix", "severity": "low", "detail": str(e)})

    report = {
        "id": f"fuzz-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
        "created_at": datetime.now(UTC).isoformat(),
        "target_base_url": target_base_url,
        "method": method,
        "path": path,
        "summary": {
            "total_findings": len(findings),
            "high": len([f for f in findings if f["severity"] == "high"]),
            "medium": len([f for f in findings if f["severity"] == "medium"]),
            "low": len([f for f in findings if f["severity"] == "low"]),
        },
        "ok": len([f for f in findings if f["severity"] in ("high", "medium")]) == 0,
        "findings": findings,
    }
    return _persist(report)


def list_fuzz_reports(limit: int = 20):
    return list(reversed(_load_db()))[:limit]
