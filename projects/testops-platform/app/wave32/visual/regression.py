from pathlib import Path
import hashlib
import json

DB = Path("reports/visual-baselines.json")


def _load():
    if not DB.exists():
        return {}
    try:
        return json.loads(DB.read_text())
    except Exception:
        return {}


def _hash_file(path: str):
    p = Path(path)
    if not p.exists():
        return None
    return hashlib.sha256(p.read_bytes()).hexdigest()


def compare_snapshot(name: str, current_path: str):
    db = _load()
    cur = _hash_file(current_path)
    if cur is None:
        return {"ok": False, "error": "snapshot file missing"}

    baseline = db.get(name)
    if baseline is None:
        db[name] = cur
        DB.parent.mkdir(parents=True, exist_ok=True)
        DB.write_text(json.dumps(db, indent=2), encoding="utf-8")
        return {"ok": True, "status": "BASELINE_CREATED", "name": name}

    changed = baseline != cur
    return {"ok": True, "status": "CHANGED" if changed else "UNCHANGED", "name": name}
