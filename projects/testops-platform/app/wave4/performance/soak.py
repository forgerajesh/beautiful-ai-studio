import json
import random
import time
from datetime import datetime, UTC
from pathlib import Path

DB = Path("reports/wave4-soak-reports.json")


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
    DB.write_text(json.dumps(rows[-100:], indent=2), encoding="utf-8")
    return report


def _pct(xs: list[int], q: int):
    if not xs:
        return 0
    ys = sorted(xs)
    idx = int(round((q / 100) * (len(ys) - 1)))
    return ys[idx]


def run_soak(duration_seconds: int = 60, interval_ms: int = 200, jitter_ms: int = 25):
    end = time.monotonic() + max(1, duration_seconds)
    samples = []

    while time.monotonic() < end:
        t0 = time.perf_counter()
        # simulate a reusable step (request/agent action/etc)
        time.sleep(max(0, (interval_ms + random.randint(-jitter_ms, jitter_ms)) / 1000.0))
        elapsed = int((time.perf_counter() - t0) * 1000)
        samples.append(elapsed)

    report = {
        "id": f"soak-{datetime.now(UTC).strftime('%Y%m%d%H%M%S')}",
        "created_at": datetime.now(UTC).isoformat(),
        "duration_seconds": duration_seconds,
        "interval_ms": interval_ms,
        "sample_count": len(samples),
        "percentiles_ms": {
            "p50": _pct(samples, 50),
            "p95": _pct(samples, 95),
            "p99": _pct(samples, 99),
            "max": max(samples) if samples else 0,
        },
        "ok": len(samples) > 0,
    }
    return _persist(report)


def list_soak_reports(limit: int = 20):
    return list(reversed(_load_db()))[:limit]
