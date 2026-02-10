#!/usr/bin/env python3
import argparse
import json
import subprocess
from pathlib import Path
from datetime import datetime, UTC

ROOT = Path(__file__).resolve().parents[1]


def run(cmd):
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


def main():
    ap = argparse.ArgumentParser(description="SECQ one-command security runner")
    ap.add_argument("--full", action="store_true", help="Run full security bundle")
    ap.add_argument("--target", default="https://example.com", help="Target URL for DAST checks")
    ap.add_argument("--notify", action="store_true", help="Send report email via SMTP env vars")
    args = ap.parse_args()

    started = datetime.now(UTC).isoformat()

    if args.full:
        code, out, err = run(["./scripts/run_full_security_suite.sh", args.target])
    else:
        code, out, err = run(["python3", "scripts/secq.py", "--config", "config/targets.yaml"])

    email = {"sent": False}
    if args.notify:
        ecode, eout, eerr = run(["python3", "scripts/send_security_email.py"])
        email = {"sent": ecode == 0, "stdout": eout[-1000:], "stderr": eerr[-1000:]}

    summary = {
        "started_at": started,
        "mode": "full" if args.full else "core",
        "target": args.target,
        "status": "PASS" if code == 0 else "FAIL",
        "notify": email,
        "reports": {
            "bundle_json": "reports/security_bundle_summary.json",
            "bundle_html": "reports/security_bundle_summary.html",
            "core_html": "reports/security_report.html",
            "core_junit": "reports/security_junit.xml",
            "sarif": "sarif/security_report.sarif",
        },
        "stdout_tail": out[-3000:],
        "stderr_tail": err[-2000:],
    }
    print(json.dumps(summary, indent=2))
    raise SystemExit(code)


if __name__ == "__main__":
    main()
