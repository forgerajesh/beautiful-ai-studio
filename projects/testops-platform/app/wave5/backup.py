from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import json
import tarfile

BACKUP_ROOT = Path("backups")
INVENTORY = BACKUP_ROOT / "inventory.json"
BACKUP_PATHS = [
    Path("reports"),
    Path("testdata"),
    Path("config"),
    Path("app/v31/governance"),
]


def _load_inventory() -> list[dict]:
    if not INVENTORY.exists():
        return []
    try:
        return json.loads(INVENTORY.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_inventory(rows: list[dict]) -> None:
    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    INVENTORY.write_text(json.dumps(rows[-200:], indent=2), encoding="utf-8")


def run_backup(label: str = "wave5") -> dict:
    BACKUP_ROOT.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    archive = BACKUP_ROOT / f"{label}-{ts}.tar.gz"

    included = []
    with tarfile.open(archive, "w:gz") as tf:
        for p in BACKUP_PATHS:
            if p.exists():
                tf.add(str(p), arcname=str(p))
                included.append(str(p))

    item = {
        "id": f"{label}-{ts}",
        "ts": datetime.now(UTC).isoformat(),
        "archive": str(archive),
        "included": included,
    }
    rows = _load_inventory()
    rows.append(item)
    _save_inventory(rows)
    return {"ok": True, **item}


def list_backups(limit: int = 20) -> list[dict]:
    rows = _load_inventory()
    return rows[-limit:][::-1]
