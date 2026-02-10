from __future__ import annotations

import csv
import json
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

ETL_CONFIG_PATH = Path("etl/profiles.yaml")
ETL_REPORT_PATH = Path("reports/etl-report.json")


@dataclass
class CheckResult:
    name: str
    status: str
    detail: str

    def as_dict(self) -> dict[str, str]:
        return {"name": self.name, "status": self.status, "detail": self.detail}


def _read_csv(path: str | Path) -> list[dict[str, str]]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"CSV not found: {p}")
    with p.open("r", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_iso_utc(text: str) -> datetime:
    return datetime.fromisoformat(text.replace("Z", "+00:00"))


def _safe_float(v: Any) -> float | None:
    try:
        return float(v)
    except Exception:
        return None


def _check_schema(rows: list[dict[str, str]], required_columns: list[str], side: str) -> CheckResult:
    columns = set(rows[0].keys()) if rows else set()
    missing = [c for c in required_columns if c not in columns]
    status = "PASS" if not missing else "FAIL"
    return CheckResult(
        name=f"schema_validation_{side}",
        status=status,
        detail="all required columns present" if status == "PASS" else f"missing columns: {missing}",
    )


def _check_rowcount(source_rows: list[dict[str, str]], target_rows: list[dict[str, str]], tolerance: int = 0) -> CheckResult:
    s, t = len(source_rows), len(target_rows)
    delta = abs(s - t)
    status = "PASS" if delta <= tolerance else "FAIL"
    return CheckResult("rowcount_reconciliation", status, f"source={s}, target={t}, delta={delta}, tolerance={tolerance}")


def _check_nulls(rows: list[dict[str, str]], columns: list[str], side: str) -> CheckResult:
    null_count = 0
    for r in rows:
        for c in columns:
            if str(r.get(c, "")).strip() == "":
                null_count += 1
    status = "PASS" if null_count == 0 else "FAIL"
    return CheckResult(f"null_check_{side}", status, f"null violations={null_count} on columns={columns}")


def _check_duplicates(rows: list[dict[str, str]], key_columns: list[str], side: str) -> CheckResult:
    keys = [tuple(r.get(c, "") for c in key_columns) for r in rows]
    dups = sum(1 for _, count in Counter(keys).items() if count > 1)
    status = "PASS" if dups == 0 else "FAIL"
    return CheckResult(f"duplicate_check_{side}", status, f"duplicate keys={dups} on key_columns={key_columns}")


def _check_pk_not_null(rows: list[dict[str, str]], pk_columns: list[str], side: str) -> CheckResult:
    bad = 0
    for r in rows:
        for c in pk_columns:
            if str(r.get(c, "")).strip() == "":
                bad += 1
    status = "PASS" if bad == 0 else "FAIL"
    return CheckResult(f"pk_check_{side}", status, f"pk null violations={bad} on pk={pk_columns}")


def _check_freshness(rows: list[dict[str, str]], timestamp_column: str, max_latency_minutes: int, side: str) -> CheckResult:
    if not rows:
        return CheckResult(f"freshness_latency_{side}", "FAIL", "no rows to validate freshness")
    latest = max(_parse_iso_utc(r[timestamp_column]) for r in rows if r.get(timestamp_column))
    latency_minutes = int((datetime.now(timezone.utc) - latest).total_seconds() / 60)
    status = "PASS" if latency_minutes <= max_latency_minutes else "FAIL"
    return CheckResult(
        f"freshness_latency_{side}",
        status,
        f"latest={latest.isoformat()}, latency_minutes={latency_minutes}, max_allowed={max_latency_minutes}",
    )


def _check_business_rules(rows: list[dict[str, str]], rules: list[dict[str, Any]], side: str) -> list[CheckResult]:
    results: list[CheckResult] = []
    for rule in rules:
        column = str(rule.get("column", ""))
        op = str(rule.get("op", "gte"))
        value = rule.get("value", 0)
        name = str(rule.get("name", f"rule_{column}_{op}_{value}"))
        violations = 0
        for r in rows:
            sample = _safe_float(r.get(column))
            threshold = _safe_float(value)
            if sample is None or threshold is None:
                violations += 1
                continue
            if op == "gte" and not (sample >= threshold):
                violations += 1
            elif op == "lte" and not (sample <= threshold):
                violations += 1
            elif op == "gt" and not (sample > threshold):
                violations += 1
            elif op == "lt" and not (sample < threshold):
                violations += 1
            elif op == "eq" and not (sample == threshold):
                violations += 1
        status = "PASS" if violations == 0 else "FAIL"
        results.append(CheckResult(f"business_rule_{side}_{name}", status, f"violations={violations}, op={op}, value={value}"))
    return results


def _load_profiles_config() -> dict[str, Any]:
    if not ETL_CONFIG_PATH.exists():
        return {"profiles": []}
    return yaml.safe_load(ETL_CONFIG_PATH.read_text(encoding="utf-8")) or {"profiles": []}


def list_profiles() -> list[dict[str, Any]]:
    cfg = _load_profiles_config()
    out = []
    for p in cfg.get("profiles", []):
        out.append({"name": p.get("name"), "description": p.get("description", "")})
    return out


def load_last_report() -> dict[str, Any]:
    if not ETL_REPORT_PATH.exists():
        return {"ok": False, "message": "No ETL report found", "report_path": str(ETL_REPORT_PATH)}
    return json.loads(ETL_REPORT_PATH.read_text(encoding="utf-8"))


def run_etl_profile(profile_name: str | None = None) -> dict[str, Any]:
    cfg = _load_profiles_config()
    profiles = cfg.get("profiles", [])
    if not profiles:
        raise ValueError("No ETL profiles configured in etl/profiles.yaml")

    selected = None
    if profile_name:
        selected = next((p for p in profiles if p.get("name") == profile_name), None)
        if not selected:
            raise ValueError(f"Unknown ETL profile: {profile_name}")
    else:
        selected = profiles[0]

    source_rows = _read_csv(selected["source"]["path"])
    target_rows = _read_csv(selected["target"]["path"])

    checks: list[CheckResult] = []
    required_cols = selected.get("required_columns", [])
    key_columns = selected.get("key_columns", [])
    timestamp_column = selected.get("freshness", {}).get("timestamp_column")
    max_latency_minutes = int(selected.get("freshness", {}).get("max_latency_minutes", 1440))

    checks.append(_check_schema(source_rows, required_cols, "source"))
    checks.append(_check_schema(target_rows, required_cols, "target"))
    checks.append(_check_rowcount(source_rows, target_rows, int(selected.get("rowcount_tolerance", 0))))
    checks.append(_check_nulls(target_rows, required_cols, "target"))
    checks.append(_check_duplicates(target_rows, key_columns, "target"))
    checks.append(_check_pk_not_null(target_rows, key_columns, "target"))

    if timestamp_column:
        checks.append(_check_freshness(target_rows, timestamp_column, max_latency_minutes, "target"))

    checks.extend(_check_business_rules(target_rows, selected.get("business_rules", []), "target"))

    pass_count = len([c for c in checks if c.status == "PASS"])
    fail_count = len(checks) - pass_count
    status = "PASS" if fail_count == 0 else "FAIL"

    report = {
        "ok": True,
        "status": status,
        "profile": selected.get("name"),
        "description": selected.get("description", ""),
        "generated_at": _now_iso(),
        "summary": {
            "total_checks": len(checks),
            "pass": pass_count,
            "fail": fail_count,
            "source_rows": len(source_rows),
            "target_rows": len(target_rows),
        },
        "checks": [c.as_dict() for c in checks],
    }

    ETL_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    ETL_REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report
