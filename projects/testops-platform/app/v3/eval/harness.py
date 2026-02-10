from pathlib import Path
import json
from datetime import datetime, UTC


def evaluate_run(payload: dict):
    counts = payload.get("counts", {})
    total = max(1, counts.get("total", 0))
    pass_rate = counts.get("pass", 0) / total
    fail_rate = (counts.get("fail", 0) + counts.get("error", 0)) / total
    score = max(0, min(100, int(pass_rate * 100 - fail_rate * 30)))
    return {"score": score, "pass_rate": round(pass_rate, 3), "fail_rate": round(fail_rate, 3)}


def persist_benchmark(result: dict, path="reports/v3-benchmarks.json"):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    data = []
    if p.exists():
        try:
            data = json.loads(p.read_text())
        except Exception:
            data = []
    data.append({"ts": datetime.now(UTC).isoformat(), **result})
    p.write_text(json.dumps(data[-500:], indent=2), encoding="utf-8")
    return str(p)
