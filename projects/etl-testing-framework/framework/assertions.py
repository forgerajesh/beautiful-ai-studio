from typing import Any, Dict, List


class DataAssertionError(AssertionError):
    pass


def fail(test_id: str, message: str, details: Dict[str, Any] | None = None):
    payload = f"[{test_id}] {message}"
    if details:
        payload += f" | details={details}"
    raise DataAssertionError(payload)


def assert_equal(test_id: str, actual: Any, expected: Any, context: Dict[str, Any] | None = None):
    if actual != expected:
        fail(test_id, f"expected={expected}, actual={actual}", context)


def assert_within_pct(test_id: str, actual: float, expected: float, tolerance_pct: float, context=None):
    diff_pct = abs(actual - expected) / max(abs(expected), 1) * 100
    if diff_pct > tolerance_pct:
        fail(
            test_id,
            f"difference {diff_pct:.2f}% exceeds tolerance {tolerance_pct}%",
            {"expected": expected, "actual": actual, **(context or {})},
        )


def assert_zero(test_id: str, value: int, context=None):
    if value != 0:
        fail(test_id, f"expected 0 violations, found {value}", context)


def assert_schema_columns(test_id: str, actual_schema: List[Dict[str, Any]], expected_columns: List[Dict[str, Any]]):
    by_name = {c["name"].lower(): c for c in actual_schema}
    mismatches = []
    for exp in expected_columns:
        name = exp["name"].lower()
        if name not in by_name:
            mismatches.append({"column": exp["name"], "issue": "missing"})
            continue
        act = by_name[name]
        if exp.get("type") and act["type"].upper() != exp["type"].upper():
            mismatches.append({"column": exp["name"], "issue": "type", "expected": exp["type"], "actual": act["type"]})
        if "nullable" in exp and act["nullable"] != exp["nullable"]:
            mismatches.append({"column": exp["name"], "issue": "nullable", "expected": exp["nullable"], "actual": act["nullable"]})

    if mismatches:
        fail(test_id, "schema mismatch", {"mismatches": mismatches})
