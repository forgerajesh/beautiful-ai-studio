from pathlib import Path
import json
from datetime import datetime, UTC

DB = Path("reports/flaky-registry.json")


def _load():
    if not DB.exists():
        return {}
    try:
        return json.loads(DB.read_text())
    except Exception:
        return {}


def record_test_result(test_id: str, passed: bool):
    db = _load()
    row = db.get(test_id, {"runs": 0, "fails": 0, "quarantined": False, "updated_at": None})
    row["runs"] += 1
    if not passed:
        row["fails"] += 1
    rate = row["fails"] / max(1, row["runs"])
    if row["runs"] >= 5 and 0.2 <= rate < 0.8:
        row["quarantined"] = True
    row["updated_at"] = datetime.now(UTC).isoformat()
    db[test_id] = row
    DB.parent.mkdir(parents=True, exist_ok=True)
    DB.write_text(json.dumps(db, indent=2), encoding="utf-8")
    return {"test_id": test_id, **row, "flaky_rate": round(rate, 3)}


def list_flaky():
    db = _load()
    out = []
    for k, v in db.items():
        rate = v.get("fails", 0) / max(1, v.get("runs", 1))
        if v.get("quarantined"):
            out.append({"test_id": k, **v, "flaky_rate": round(rate, 3)})
    return out
