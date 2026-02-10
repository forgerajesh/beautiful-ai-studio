from pathlib import Path
import json
from datetime import datetime, UTC

AUDIT = Path("reports/v31-approval-audit.json")


def _load():
    if not AUDIT.exists():
        return []
    try:
        return json.loads(AUDIT.read_text())
    except Exception:
        return []


def log_approval(action: str, approved: bool, actor: str, payload: dict):
    rows = _load()
    rows.append({
        "ts": datetime.now(UTC).isoformat(),
        "action": action,
        "approved": approved,
        "actor": actor,
        "payload": payload,
    })
    AUDIT.parent.mkdir(parents=True, exist_ok=True)
    AUDIT.write_text(json.dumps(rows[-1000:], indent=2), encoding="utf-8")
    return rows[-1]


def list_audit(limit: int = 100):
    return _load()[-limit:]
