from pathlib import Path
import json


def load_benchmark_trends(limit: int = 50):
    p = Path("reports/v3-benchmarks.json")
    if not p.exists():
        return []
    try:
        rows = json.loads(p.read_text())
    except Exception:
        return []

    out = []
    for r in rows[-limit:]:
        score = None
        if isinstance(r.get("evaluation"), dict):
            score = r["evaluation"].get("score")
        if score is None and isinstance(r.get("decision"), dict):
            score = r["decision"].get("score")
        out.append({"ts": r.get("ts"), "score": int(score or 0)})
    return out
