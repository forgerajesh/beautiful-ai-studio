import time
from functools import wraps

METRICS = {"runs": 0, "failures": 0, "durations_ms": []}


def instrument(name: str):
    def deco(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            t0 = time.time()
            METRICS["runs"] += 1
            try:
                out = fn(*args, **kwargs)
                METRICS["durations_ms"].append(int((time.time() - t0) * 1000))
                return out
            except Exception:
                METRICS["failures"] += 1
                METRICS["durations_ms"].append(int((time.time() - t0) * 1000))
                raise
        return wrapper
    return deco


def snapshot():
    d = METRICS["durations_ms"]
    avg = int(sum(d) / len(d)) if d else 0
    return {"runs": METRICS["runs"], "failures": METRICS["failures"], "avg_ms": avg, "samples": len(d)}
