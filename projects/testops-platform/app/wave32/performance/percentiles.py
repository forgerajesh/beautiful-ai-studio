def compute_percentiles(samples_ms: list[int]):
    if not samples_ms:
        return {"p50": 0, "p95": 0, "p99": 0, "count": 0}
    xs = sorted(samples_ms)

    def p(q):
        idx = int(round((q / 100) * (len(xs) - 1)))
        return xs[idx]

    return {"p50": p(50), "p95": p(95), "p99": p(99), "count": len(xs)}
