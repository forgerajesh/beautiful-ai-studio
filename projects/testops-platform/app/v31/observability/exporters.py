from app.v3.observability.telemetry import snapshot


def prometheus_text():
    s = snapshot()
    lines = [
        "# HELP testops_runs_total Total instrumented runs",
        "# TYPE testops_runs_total counter",
        f"testops_runs_total {s['runs']}",
        "# HELP testops_failures_total Total instrumented failures",
        "# TYPE testops_failures_total counter",
        f"testops_failures_total {s['failures']}",
        "# HELP testops_duration_avg_ms Average duration in ms",
        "# TYPE testops_duration_avg_ms gauge",
        f"testops_duration_avg_ms {s['avg_ms']}",
    ]
    return "\n".join(lines) + "\n"
