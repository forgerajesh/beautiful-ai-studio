from pathlib import Path
import json
import random
from datetime import datetime, UTC

ROOT = Path("testdata")
PROFILES = ROOT / "profiles"
STATE = ROOT / "state.json"


def _ensure():
    ROOT.mkdir(parents=True, exist_ok=True)
    PROFILES.mkdir(parents=True, exist_ok=True)


def _write_state(data: dict):
    _ensure()
    STATE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _read_state():
    _ensure()
    if not STATE.exists():
        return {"active_profile": None, "datasets": {}, "updated_at": None}
    try:
        return json.loads(STATE.read_text())
    except Exception:
        return {"active_profile": None, "datasets": {}, "updated_at": None}


def list_profiles():
    _ensure()
    return sorted([p.stem for p in PROFILES.glob("*.json")])


def seed_profile(profile: str):
    _ensure()
    p = PROFILES / f"{profile}.json"
    if not p.exists():
        sample = {
            "name": profile,
            "users": [
                {"username": "standard_user", "role": "user"},
                {"username": "qa_admin", "role": "admin"}
            ],
            "orders": [{"id": 1001, "status": "created"}],
        }
        p.write_text(json.dumps(sample, indent=2), encoding="utf-8")
    return str(p)


def load_profile(profile: str):
    p = PROFILES / f"{profile}.json"
    if not p.exists():
        return {"ok": False, "error": "profile not found"}
    data = json.loads(p.read_text())
    st = _read_state()
    st["active_profile"] = profile
    st["datasets"] = data
    st["updated_at"] = datetime.now(UTC).isoformat()
    _write_state(st)
    return {"ok": True, "active_profile": profile, "records": {k: len(v) if isinstance(v, list) else 1 for k, v in data.items() if k != "name"}}


def generate_synthetic(profile: str, users: int = 10, orders: int = 20):
    seed_profile(profile)
    data = {
        "name": profile,
        "users": [{"username": f"user_{i}", "role": random.choice(["user", "manager", "admin"])} for i in range(users)],
        "orders": [{"id": 10000 + i, "status": random.choice(["created", "paid", "shipped", "cancelled"])} for i in range(orders)],
    }
    p = PROFILES / f"{profile}.json"
    p.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return {"ok": True, "profile": profile, "users": users, "orders": orders, "path": str(p)}


def reset_active():
    st = _read_state()
    st["active_profile"] = None
    st["datasets"] = {}
    st["updated_at"] = datetime.now(UTC).isoformat()
    _write_state(st)
    return {"ok": True}


def status():
    return _read_state()
