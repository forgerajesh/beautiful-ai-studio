import time
import requests
from app.core.models import Finding


def run_non_functional(cfg: dict) -> list[Finding]:
    findings: list[Finding] = []
    checks = cfg.get("features", {}).get("non_functional", {}).get("checks", [])

    for c in checks:
        ctype = c.get("type")
        cid = c.get("id", ctype)
        url = c.get("url")
        if ctype == "http_sla":
            start = time.time()
            try:
                r = requests.get(url, timeout=20)
                elapsed = int((time.time() - start) * 1000)
                max_ms = int(c.get("max_ms", 1000))
                ok = r.ok and elapsed <= max_ms
                findings.append(Finding("non_functional", cid, "medium", "PASS" if ok else "FAIL", f"HTTP SLA {'met' if ok else 'breached'}", {"status_code": r.status_code, "elapsed_ms": elapsed, "max_ms": max_ms}))
            except Exception as e:
                findings.append(Finding("non_functional", cid, "medium", "ERROR", f"HTTP SLA check error: {e}"))

        elif ctype == "light_load":
            reqs = int(c.get("requests", 5))
            max_avg = int(c.get("max_avg_ms", 1500))
            times = []
            failures = 0
            for _ in range(reqs):
                t0 = time.time()
                try:
                    r = requests.get(url, timeout=20)
                    if not r.ok:
                        failures += 1
                except Exception:
                    failures += 1
                times.append(int((time.time() - t0) * 1000))
            avg = int(sum(times) / max(len(times), 1))
            ok = failures == 0 and avg <= max_avg
            findings.append(Finding("non_functional", cid, "medium", "PASS" if ok else "FAIL", "Light load check completed", {"avg_ms": avg, "max_avg_ms": max_avg, "failures": failures, "samples": times}))
        else:
            findings.append(Finding("non_functional", cid, "low", "INFO", f"Unsupported non-functional check type: {ctype}"))

    return findings
