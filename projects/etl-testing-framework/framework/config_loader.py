import yaml
from .models import TestCase


def load_suite(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    tests = []
    for t in raw.get("tests", []):
        tests.append(
            TestCase(
                id=t["id"],
                type=t["type"],
                severity=t.get("severity", "medium"),
                params=t.get("params", {}),
                tags=t.get("tags", []),
            )
        )
    raw["tests"] = tests
    return raw
