from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import json
import uuid

from app.integrations.artifacts import generate_testcases, generate_testplan, generate_teststrategy
from app.wave31.traceability.matrix import build_traceability

REQ_STORE = Path("reports/requirements-store.json")
RUN_STORE = Path("reports/qa-lifecycle-runs.json")


def _utc_now() -> str:
    return datetime.now(UTC).isoformat()


def _load_json(path: Path, default: dict) -> dict:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _save_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _ensure_req_store() -> dict:
    return _load_json(REQ_STORE, {"requirements": []})


def list_requirements() -> list[dict]:
    data = _ensure_req_store()
    return data.get("requirements", [])


def create_requirement(payload: dict) -> dict:
    data = _ensure_req_store()
    reqs = data.setdefault("requirements", [])
    req_id = payload.get("id") or f"REQ-{uuid.uuid4().hex[:8].upper()}"
    row = {
        "id": req_id,
        "title": str(payload.get("title", "Untitled requirement")),
        "description": str(payload.get("description", "")),
        "risk": str(payload.get("risk", "medium")).lower(),
        "domain": str(payload.get("domain", "functional")).lower(),
        "priority": str(payload.get("priority", "P2")).upper(),
        "status": str(payload.get("status", "draft")).lower(),
        "tags": payload.get("tags") or [],
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
        "version": 1,
        "versions": [
            {
                "version": 1,
                "timestamp": _utc_now(),
                "snapshot": payload,
            }
        ],
    }
    reqs.append(row)
    _save_json(REQ_STORE, data)
    return row


def update_requirement(req_id: str, payload: dict) -> dict | None:
    data = _ensure_req_store()
    reqs = data.setdefault("requirements", [])
    for row in reqs:
        if row.get("id") == req_id:
            row["title"] = str(payload.get("title", row.get("title", "")))
            row["description"] = str(payload.get("description", row.get("description", "")))
            row["risk"] = str(payload.get("risk", row.get("risk", "medium"))).lower()
            row["domain"] = str(payload.get("domain", row.get("domain", "functional"))).lower()
            row["priority"] = str(payload.get("priority", row.get("priority", "P2"))).upper()
            row["status"] = str(payload.get("status", row.get("status", "draft"))).lower()
            row["tags"] = payload.get("tags", row.get("tags", []))
            row["version"] = int(row.get("version", 1)) + 1
            row["updated_at"] = _utc_now()
            row.setdefault("versions", []).append(
                {
                    "version": row["version"],
                    "timestamp": _utc_now(),
                    "snapshot": {
                        "title": row["title"],
                        "description": row["description"],
                        "risk": row["risk"],
                        "domain": row["domain"],
                        "priority": row["priority"],
                        "status": row["status"],
                        "tags": row["tags"],
                    },
                }
            )
            _save_json(REQ_STORE, data)
            return row
    return None


def delete_requirement(req_id: str) -> bool:
    data = _ensure_req_store()
    reqs = data.setdefault("requirements", [])
    before = len(reqs)
    reqs[:] = [r for r in reqs if r.get("id") != req_id]
    _save_json(REQ_STORE, data)
    return len(reqs) != before


def get_requirement_versions(req_id: str) -> list[dict]:
    for row in list_requirements():
        if row.get("id") == req_id:
            return row.get("versions", [])
    return []


def generate_strategy(requirements: list[dict]) -> dict:
    risks = {}
    domains = {}
    for r in requirements:
        risks[r.get("risk", "medium")] = risks.get(r.get("risk", "medium"), 0) + 1
        domains[r.get("domain", "functional")] = domains.get(r.get("domain", "functional"), 0) + 1

    focus = [
        "security hardening" if risks.get("high", 0) > 0 else "functional stability",
        "api contract coverage" if domains.get("api", 0) > 0 else "ui workflow coverage",
        "performance baselining" if domains.get("non-functional", 0) > 0 else "regression smoke",
    ]

    return {
        "generated_at": _utc_now(),
        "risk_distribution": risks,
        "domain_distribution": domains,
        "strategy": {
            "approach": "risk-based",
            "focus_areas": focus,
            "entry_criteria": ["build deployed", "test data ready", "monitoring healthy"],
            "exit_criteria": ["no critical blockers", "traceability complete", "stakeholder sign-off"],
        },
        "artifact_path": generate_teststrategy("TestOps Platform", "artifacts"),
    }


def generate_test_design(requirements: list[dict], strategy: dict) -> dict:
    matrix = []
    for r in requirements:
        rid = r.get("id")
        matrix.extend(
            [
                {"requirement_id": rid, "scenario": "happy_path", "coverage": "functional", "priority": r.get("priority", "P2")},
                {"requirement_id": rid, "scenario": "negative_path", "coverage": "functional", "priority": r.get("priority", "P2")},
                {"requirement_id": rid, "scenario": "edge_case", "coverage": "resilience", "priority": "P1" if r.get("risk") == "high" else "P2"},
            ]
        )
    return {
        "generated_at": _utc_now(),
        "strategy_focus": strategy.get("strategy", {}).get("focus_areas", []),
        "scenario_matrix": matrix,
        "total_scenarios": len(matrix),
    }


def generate_test_cases(requirements: list[dict], strategy: dict, design: dict) -> dict:
    cases = []
    for i, row in enumerate(design.get("scenario_matrix", []), start=1):
        cases.append(
            {
                "id": f"TC-{i:04d}",
                "requirement_id": row.get("requirement_id"),
                "title": f"{row.get('scenario')} for {row.get('requirement_id')}",
                "type": row.get("coverage"),
                "priority": row.get("priority"),
                "preconditions": ["service available", "user authenticated"],
                "expected": "behavior matches requirement",
            }
        )

    return {
        "generated_at": _utc_now(),
        "source": {
            "requirements_count": len(requirements),
            "strategy": strategy.get("strategy", {}).get("approach", "risk-based"),
        },
        "test_cases": cases,
        "artifact_path": generate_testcases("TestOps Platform", "artifacts"),
    }


def build_test_plan(requirements: list[dict], test_cases: dict) -> dict:
    high_risk = [r for r in requirements if r.get("risk") == "high"]
    return {
        "generated_at": _utc_now(),
        "scope": {
            "requirements": [r.get("id") for r in requirements],
            "test_case_count": len(test_cases.get("test_cases", [])),
            "high_risk_requirements": [r.get("id") for r in high_risk],
        },
        "schedule": {
            "smoke": "Day 1",
            "regression": "Day 2",
            "specialized": "Day 3",
        },
        "entry_criteria": ["requirements baselined", "environments healthy", "blocking defects triaged"],
        "exit_criteria": ["critical coverage complete", "no open Sev-1", "traceability reviewed"],
        "artifact_path": generate_testplan("TestOps Platform", "artifacts"),
    }


def map_testing_types(requirements: list[dict], test_cases: dict) -> dict:
    mapped = {
        "functional": [],
        "non-functional": [],
        "security": [],
        "mobile": [],
        "etl": [],
        "api": [],
    }
    for r in requirements:
        domain = r.get("domain", "functional")
        rid = r.get("id")
        if domain in mapped:
            mapped[domain].append(rid)
        else:
            mapped["functional"].append(rid)
        if r.get("risk") == "high":
            mapped["security"].append(rid)

    for tc in test_cases.get("test_cases", []):
        t = tc.get("type", "functional")
        if t in mapped and tc.get("requirement_id") not in mapped[t]:
            mapped[t].append(tc.get("requirement_id"))

    return {
        "generated_at": _utc_now(),
        "mapping": mapped,
        "summary": {k: len(v) for k, v in mapped.items()},
    }


def execute_lifecycle(payload: dict) -> dict:
    selected_suites = payload.get("suites") or ["functional", "api", "security"]
    selected_agents = payload.get("agents") or ["playwright", "api", "security"]
    return {
        "executed_at": _utc_now(),
        "status": "triggered",
        "suites": selected_suites,
        "agents": selected_agents,
        "orchestration": {
            "mode": "sequential",
            "run_id": f"RUN-{uuid.uuid4().hex[:8].upper()}",
            "note": "Use /run or /agent/run for full execution",
        },
    }


def get_lifecycle_state(requirements: list[dict], run: dict | None = None) -> dict:
    req_state = []
    for r in requirements:
        req_state.append(
            {
                "requirement_id": r.get("id"),
                "status": "planned" if r.get("status") in ("draft", "planned") else "in-progress",
                "risk": r.get("risk"),
            }
        )
    return {
        "generated_at": _utc_now(),
        "requirements": req_state,
        "plan_status": "ready" if requirements else "empty",
        "execution_status": (run or {}).get("execution", {}).get("status", "not-started"),
    }


def _ensure_runs_store() -> dict:
    return _load_json(RUN_STORE, {"runs": []})


def save_lifecycle_run(payload: dict) -> dict:
    data = _ensure_runs_store()
    runs = data.setdefault("runs", [])
    run_id = payload.get("run_id") or f"LIFE-{uuid.uuid4().hex[:8].upper()}"

    traceability = payload.get("traceability")
    if not traceability:
        try:
            traceability = build_traceability(requirements_path="requirements/requirements.json", tests_path="artifacts/TESTCASES.md")
        except Exception:
            traceability = {"matrix": []}

    record = {
        "run_id": run_id,
        "created_at": _utc_now(),
        "updated_at": _utc_now(),
        "requirements": payload.get("requirements") or [],
        "strategy": payload.get("strategy") or {},
        "design": payload.get("design") or {},
        "test_cases": payload.get("test_cases") or {},
        "plan": payload.get("plan") or {},
        "types_mapping": payload.get("types_mapping") or {},
        "execution": payload.get("execution") or {},
        "traceability": traceability,
        "integrations": payload.get("integrations") or {},
    }

    runs[:] = [r for r in runs if r.get("run_id") != run_id]
    runs.append(record)
    _save_json(RUN_STORE, data)
    return record


def list_lifecycle_runs(limit: int = 20) -> list[dict]:
    data = _ensure_runs_store()
    return list(reversed(data.get("runs", [])))[0:limit]


def get_lifecycle_run(run_id: str) -> dict | None:
    data = _ensure_runs_store()
    for row in data.get("runs", []):
        if row.get("run_id") == run_id:
            return row
    return None
