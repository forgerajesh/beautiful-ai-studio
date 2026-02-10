from pathlib import Path
import json
from datetime import datetime, UTC


def build_executive_summary():
    p = Path("reports/summary.json")
    findings = json.loads(p.read_text()) if p.exists() else []

    total = len(findings)
    passed = len([f for f in findings if f.get("status") == "PASS"])
    failed = len([f for f in findings if f.get("status") == "FAIL"])
    errors = len([f for f in findings if f.get("status") == "ERROR"])

    by_domain = {}
    for f in findings:
        d = f.get("domain", "unknown")
        by_domain.setdefault(d, {"total": 0, "fail": 0, "error": 0})
        by_domain[d]["total"] += 1
        if f.get("status") == "FAIL":
            by_domain[d]["fail"] += 1
        if f.get("status") == "ERROR":
            by_domain[d]["error"] += 1

    payload = {
        "ts": datetime.now(UTC).isoformat(),
        "kpi": {
            "total": total,
            "pass": passed,
            "fail": failed,
            "error": errors,
            "pass_rate": round((passed / total), 3) if total else 0,
        },
        "domains": by_domain,
    }

    out = Path("reports/analytics/executive-summary.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload
