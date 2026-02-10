from pathlib import Path
import json
from datetime import datetime, UTC


def build_traceability(requirements_path: str = "requirements/requirements.json", tests_path: str = "artifacts/TESTCASES.md"):
    req_p = Path(requirements_path)
    tests_p = Path(tests_path)

    reqs = []
    if req_p.exists():
        try:
            reqs = json.loads(req_p.read_text())
        except Exception:
            reqs = []

    tests_text = tests_p.read_text() if tests_p.exists() else ""

    matrix = []
    covered = 0
    for r in reqs:
        rid = r.get("id", "REQ-UNKNOWN")
        title = r.get("title", "")
        key = (r.get("keyword") or title.split(" ")[0] if title else "").lower()
        is_covered = key and key in tests_text.lower()
        if is_covered:
            covered += 1
        matrix.append({"requirement_id": rid, "title": title, "covered": bool(is_covered)})

    total = len(reqs)
    coverage = round((covered / total), 3) if total else 0

    out = {
        "ts": datetime.now(UTC).isoformat(),
        "total_requirements": total,
        "covered": covered,
        "coverage": coverage,
        "matrix": matrix,
    }

    out_path = Path("reports/traceability-matrix.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    return out
