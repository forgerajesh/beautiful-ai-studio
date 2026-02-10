from pathlib import Path
import json
from datetime import datetime, UTC

DB = Path("reports/wave3-hitl.json")


def _load():
    if not DB.exists():
        return []
    try:
        return json.loads(DB.read_text())
    except Exception:
        return []


def create_checkpoint(title: str, actions: list[dict], created_by: str):
    rows = _load()
    cid = f"hitl-{len(rows)+1}"
    row = {
        "id": cid,
        "ts": datetime.now(UTC).isoformat(),
        "title": title,
        "actions": actions,
        "created_by": created_by,
        "status": "AWAITING_APPROVAL",
        "approved_by": [],
    }
    rows.append(row)
    DB.parent.mkdir(parents=True, exist_ok=True)
    DB.write_text(json.dumps(rows, indent=2), encoding="utf-8")
    return row


def approve_checkpoint(checkpoint_id: str, actor: str):
    rows = _load()
    for r in rows:
        if r["id"] == checkpoint_id:
            if actor not in r["approved_by"]:
                r["approved_by"].append(actor)
            if len(r["approved_by"]) >= 1:
                r["status"] = "APPROVED"
            DB.write_text(json.dumps(rows, indent=2), encoding="utf-8")
            return r
    return None


def list_checkpoints():
    return _load()
