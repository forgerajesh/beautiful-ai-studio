import json
from collections import Counter
from datetime import datetime, UTC
from math import sqrt
from pathlib import Path

DB = Path("reports/wave4-drift-reports.json")


def _mean(xs):
    return sum(xs) / len(xs) if xs else 0.0


def _std(xs):
    if len(xs) < 2:
        return 0.0
    m = _mean(xs)
    return sqrt(sum((x - m) ** 2 for x in xs) / len(xs))


def _load_db():
    if not DB.exists():
        return []
    try:
        return json.loads(DB.read_text())
    except Exception:
        return []


def _persist(report):
    rows = _load_db()
    rows.append(report)
    DB.parent.mkdir(parents=True, exist_ok=True)
    DB.write_text(json.dumps(rows[-200:], indent=2), encoding="utf-8")
    return report


def analyze_drift(baseline: list[dict], current: list[dict], numeric_fields: list[str], categorical_fields: list[str]):
    numeric = {}
    categorical = {}

    for f in numeric_fields:
        b = [float(r[f]) for r in baseline if f in r and r[f] is not None]
        c = [float(r[f]) for r in current if f in r and r[f] is not None]
        bm, bs = _mean(b), _std(b)
        cm, cs = _mean(c), _std(c)
        z = 0.0 if bs == 0 else abs(cm - bm) / bs
        numeric[f] = {
            "baseline": {"mean": round(bm, 4), "std": round(bs, 4), "count": len(b)},
            "current": {"mean": round(cm, 4), "std": round(cs, 4), "count": len(c)},
            "mean_shift": round(cm - bm, 4),
            "z_score": round(z, 4),
            "drift": z >= 2.0,
        }

    for f in categorical_fields:
        b = Counter([str(r[f]) for r in baseline if f in r and r[f] is not None])
        c = Counter([str(r[f]) for r in current if f in r and r[f] is not None])
        keys = sorted(set(b.keys()) | set(c.keys()))
        bt, ct = max(1, sum(b.values())), max(1, sum(c.values()))
        l1 = sum(abs((b[k] / bt) - (c[k] / ct)) for k in keys)
        categorical[f] = {
            "baseline": {k: round(b[k] / bt, 4) for k in keys},
            "current": {k: round(c[k] / ct, 4) for k in keys},
            "frequency_shift_l1": round(l1, 4),
            "drift": l1 >= 0.3,
        }

    report = {
        "id": f"drift-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
        "created_at": datetime.now(UTC).isoformat(),
        "summary": {
            "numeric_drift_fields": [k for k, v in numeric.items() if v["drift"]],
            "categorical_drift_fields": [k for k, v in categorical.items() if v["drift"]],
        },
        "numeric": numeric,
        "categorical": categorical,
    }
    report["ok"] = len(report["summary"]["numeric_drift_fields"]) == 0 and len(report["summary"]["categorical_drift_fields"]) == 0
    return _persist(report)


def list_drift_reports(limit: int = 20):
    return list(reversed(_load_db()))[:limit]
