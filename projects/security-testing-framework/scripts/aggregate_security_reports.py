#!/usr/bin/env python3
import json
from pathlib import Path
from datetime import datetime, UTC

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "reports"
OUT.mkdir(exist_ok=True)


def load_json(name):
    p = OUT / name
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8", errors="ignore"))
    except Exception:
        return None


def count_semgrep(d):
    if not d: return 0
    return len(d.get("results", []))

def count_bandit(d):
    if not d: return 0
    return len(d.get("results", []))

def count_trivy(d):
    if not d: return 0
    total = 0
    for r in d.get("Results", []):
        total += len(r.get("Vulnerabilities", []) or [])
    return total

def count_pip_audit(d):
    if not d: return 0
    # pip-audit json may be list of deps with vulns
    if isinstance(d, list):
        c = 0
        for dep in d:
            c += len(dep.get("vulns", []))
        return c
    return 0

def count_gitleaks(d):
    if not d: return 0
    if isinstance(d, list): return len(d)
    return 0

def count_checkov(d):
    if not d: return 0
    # when using -o json, output may be list or object
    if isinstance(d, list):
        return len(d)
    if isinstance(d, dict):
        return len(d.get("results", {}).get("failed_checks", []))
    return 0

def count_zap(d):
    if not d: return 0
    # baseline/full JSON structure contains site->alerts
    alerts = 0
    if isinstance(d, dict):
        for s in d.get("site", []):
            alerts += len(s.get("alerts", []))
    return alerts


def main():
    semgrep = load_json("semgrep.json")
    bandit = load_json("bandit.json")
    trivy = load_json("trivy_fs.json")
    pipa = load_json("pip_audit.json")
    gitleaks = load_json("gitleaks.json")
    checkov = load_json("checkov.json")
    zap_base = load_json("zap_report.json")
    zap_full = load_json("zap_full_report.json")

    summary = {
        "generated_at": datetime.now(UTC).isoformat(),
        "counts": {
            "sast_semgrep": count_semgrep(semgrep),
            "sast_bandit": count_bandit(bandit),
            "vuln_trivy_fs": count_trivy(trivy),
            "vuln_pip_audit": count_pip_audit(pipa),
            "secrets_gitleaks": count_gitleaks(gitleaks),
            "iac_checkov": count_checkov(checkov),
            "dast_zap_baseline": count_zap(zap_base),
            "dast_zap_full": count_zap(zap_full),
        },
        "reports": {
            "semgrep": "reports/semgrep.json",
            "bandit": "reports/bandit.json",
            "trivy": "reports/trivy_fs.json",
            "pip_audit": "reports/pip_audit.json",
            "gitleaks": "reports/gitleaks.json",
            "checkov": "reports/checkov.json",
            "zap_baseline": "reports/zap_report.json",
            "zap_full": "reports/zap_full_report.json",
        }
    }
    total_findings = sum(summary["counts"].values())
    summary["total_findings"] = total_findings
    summary["status"] = "PASS" if total_findings == 0 else "FAIL"

    json_out = OUT / "security_bundle_summary.json"
    json_out.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    html = f"""
    <html><head><title>Security Bundle Summary</title>
    <style>body{{font-family:Arial;margin:24px;background:#f8fafc}} .card{{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px}}</style>
    </head><body>
    <h1>Security Bundle Summary</h1>
    <div class='card'><b>Status:</b> {summary['status']} | <b>Total findings:</b> {total_findings}</div>
    <div class='card'><pre>{json.dumps(summary['counts'], indent=2)}</pre></div>
    </body></html>
    """
    (OUT / "security_bundle_summary.html").write_text(html, encoding="utf-8")

    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    main()
