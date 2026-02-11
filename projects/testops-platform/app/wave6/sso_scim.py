from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import json
import os
from typing import Any

from app.wave41.auth.oidc_jwt import auth_mode_status

SCIM_STORE = Path("reports/wave6/scim_users.json")
SCIM_AUDIT = Path("reports/wave6/scim_audit.jsonl")


def enterprise_sso_readiness() -> dict[str, Any]:
    auth = auth_mode_status()
    scim_enabled = str(os.getenv("SCIM_ENABLED", "true")).lower() in ("1", "true", "yes", "on")
    readiness_checks = {
        "oidc_or_jwks_configured": bool(auth.get("has_jwks") or auth.get("has_issuer")),
        "fallback_policy_defined": auth.get("fallback_enabled") is not None,
        "scim_enabled": scim_enabled,
        "role_mapping_enabled": bool(os.getenv("SSO_ROLE_MAPPING", "realm_access.roles")),
    }
    score = sum(1 for v in readiness_checks.values() if v)
    return {
        "auth": auth,
        "checks": readiness_checks,
        "score": score,
        "max_score": len(readiness_checks),
        "ready": score == len(readiness_checks),
    }


def _load_store() -> dict[str, Any]:
    if not SCIM_STORE.exists():
        return {"users": {}}
    return json.loads(SCIM_STORE.read_text(encoding="utf-8"))


def _save_store(data: dict[str, Any]) -> None:
    SCIM_STORE.parent.mkdir(parents=True, exist_ok=True)
    SCIM_STORE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _append_audit(action: str, actor: str, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    event = {
        "ts": datetime.now(UTC).isoformat(),
        "action": action,
        "actor": actor,
        "user_id": user_id,
        "payload": payload,
    }
    SCIM_AUDIT.parent.mkdir(parents=True, exist_ok=True)
    with SCIM_AUDIT.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")
    return event


def scim_create(user: dict[str, Any], actor: str = "system") -> dict[str, Any]:
    user_id = str(user.get("id") or user.get("userName") or "")
    if not user_id:
        return {"ok": False, "error": "missing id/userName"}
    store = _load_store()
    users = store.setdefault("users", {})
    users[user_id] = {**user, "active": bool(user.get("active", True)), "updated_at": datetime.now(UTC).isoformat()}
    _save_store(store)
    audit = _append_audit("scim_create", actor, user_id, user)
    return {"ok": True, "user": users[user_id], "audit": audit}


def scim_update(user_id: str, updates: dict[str, Any], actor: str = "system") -> dict[str, Any]:
    store = _load_store()
    users = store.setdefault("users", {})
    if user_id not in users:
        return {"ok": False, "error": "user not found"}
    users[user_id] = {**users[user_id], **updates, "updated_at": datetime.now(UTC).isoformat()}
    _save_store(store)
    audit = _append_audit("scim_update", actor, user_id, updates)
    return {"ok": True, "user": users[user_id], "audit": audit}


def scim_deactivate(user_id: str, actor: str = "system") -> dict[str, Any]:
    store = _load_store()
    users = store.setdefault("users", {})
    if user_id not in users:
        return {"ok": False, "error": "user not found"}
    users[user_id]["active"] = False
    users[user_id]["updated_at"] = datetime.now(UTC).isoformat()
    _save_store(store)
    audit = _append_audit("scim_deactivate", actor, user_id, {"active": False})
    return {"ok": True, "user": users[user_id], "audit": audit}


def scim_list() -> dict[str, Any]:
    store = _load_store()
    return {"users": list((store.get("users") or {}).values())}
