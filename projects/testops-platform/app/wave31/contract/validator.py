import json
from pathlib import Path


def validate_contract(contract_path: str):
    p = Path(contract_path)
    if not p.exists():
        return {"ok": False, "error": f"contract file not found: {contract_path}"}

    c = json.loads(p.read_text())
    missing = []
    for key in ["name", "version", "provider", "consumer", "endpoints"]:
        if key not in c:
            missing.append(key)

    endpoint_issues = []
    for i, ep in enumerate(c.get("endpoints", []), start=1):
        for k in ["method", "path", "expected_status"]:
            if k not in ep:
                endpoint_issues.append({"endpoint_index": i, "missing": k})

    ok = (len(missing) == 0 and len(endpoint_issues) == 0)
    return {
        "ok": ok,
        "contract": c.get("name", p.name),
        "missing_fields": missing,
        "endpoint_issues": endpoint_issues,
        "endpoint_count": len(c.get("endpoints", [])),
    }
