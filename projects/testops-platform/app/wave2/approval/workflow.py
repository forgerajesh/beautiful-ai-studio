from pathlib import Path
import json
from datetime import datetime, UTC

DB = Path("reports/wave2-approvals.json")


def _load():
    if not DB.exists():
        return []
    try:
        return json.loads(DB.read_text())
    except Exception:
        return []


def create_request(title: str, payload: dict, requested_by: str):
    rows = _load()
    rid = f"apr-{len(rows)+1}"
    row = {
        "id": rid,
        "ts": datetime.now(UTC).isoformat(),
        "title": title,
        "payload": payload,
        "requested_by": requested_by,
        "status": "PENDING",
        "approvals": [],
    }
    rows.append(row)
    DB.parent.mkdir(parents=True, exist_ok=True)
    DB.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    return row


def approve(request_id: str, actor: str):
    rows = _load()
    for r in rows:
        if r["id"] == request_id:
            r["approvals"].append(actor)
            if len(set(r["approvals"])) >= 2:
                r["status"] = "APPROVED"
            DB.write_text(json.dumps(rows, indent=2), encoding="utf-8")
            return r
    return None


def list_requests():
    return _load()
