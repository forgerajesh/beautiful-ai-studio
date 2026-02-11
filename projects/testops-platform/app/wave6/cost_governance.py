from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import json
from typing import Any

from app.wave5.alerts import send_alert

BUDGETS_FILE = Path("reports/wave6/budgets.json")
USAGE_LOG = Path("reports/wave6/usage.jsonl")


def _load_budgets() -> dict[str, Any]:
    if not BUDGETS_FILE.exists():
        return {"budgets": {}}
    return json.loads(BUDGETS_FILE.read_text(encoding="utf-8"))


def _save_budgets(data: dict[str, Any]) -> None:
    BUDGETS_FILE.parent.mkdir(parents=True, exist_ok=True)
    BUDGETS_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def set_budget_policy(scope: str, daily_limit: float, warning_threshold: float = 0.8) -> dict[str, Any]:
    row = {
        "scope": scope,
        "daily_limit": float(daily_limit),
        "warning_threshold": float(warning_threshold),
        "updated_at": datetime.now(UTC).isoformat(),
    }
    data = _load_budgets()
    data.setdefault("budgets", {})[scope] = row
    _save_budgets(data)
    return {"ok": True, "policy": row}


def track_usage(scope: str, amount: float, meta: dict[str, Any] | None = None) -> dict[str, Any]:
    ts = datetime.now(UTC).isoformat()
    event = {"ts": ts, "scope": scope, "amount": float(amount), "meta": meta or {}}
    USAGE_LOG.parent.mkdir(parents=True, exist_ok=True)
    with USAGE_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")

    decision = throttle_decision(scope)
    warning = None
    if decision.get("warn"):
        warning = send_alert("webhook", {
            "summary": f"Budget warning for {scope}",
            "description": f"Usage ratio={decision.get('usage_ratio')}",
            "severity": "warning",
            "source": "wave6/cost-governance",
        })
    return {"ok": True, "event": event, "decision": decision, "warning_alert": warning}


def _daily_usage(scope: str) -> float:
    if not USAGE_LOG.exists():
        return 0.0
    today = datetime.now(UTC).date().isoformat()
    total = 0.0
    for line in USAGE_LOG.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("scope") != scope:
            continue
        if not str(row.get("ts", "")).startswith(today):
            continue
        total += float(row.get("amount", 0.0))
    return total


def throttle_decision(scope: str) -> dict[str, Any]:
    data = _load_budgets()
    policy = (data.get("budgets") or {}).get(scope)
    if not policy:
        return {"ok": True, "scope": scope, "throttle": False, "warn": False, "reason": "no policy"}

    usage = _daily_usage(scope)
    limit = float(policy.get("daily_limit", 0.0))
    threshold = float(policy.get("warning_threshold", 0.8))
    ratio = (usage / limit) if limit > 0 else 0.0
    return {
        "ok": True,
        "scope": scope,
        "usage_today": usage,
        "daily_limit": limit,
        "usage_ratio": round(ratio, 4),
        "warn": ratio >= threshold,
        "throttle": ratio >= 1.0,
    }


def list_policies() -> dict[str, Any]:
    return _load_budgets()
