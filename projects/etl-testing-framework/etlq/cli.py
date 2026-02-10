import argparse
import json
import subprocess
from pathlib import Path
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"


def run_cmd(cmd, env=None):
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env=env)
    return {"code": p.returncode, "stdout": p.stdout, "stderr": p.stderr}


def ai_confidence(ai_text: str) -> int:
    if not ai_text:
        return 20
    score = 50
    if "root cause" in ai_text.lower():
        score += 15
    if "sql" in ai_text.lower():
        score += 15
    if "fix" in ai_text.lower() or "remediation" in ai_text.lower():
        score += 15
    return min(score, 95)


def build_exec_report(test_res, ai_notes, email_mode):
    REPORTS.mkdir(exist_ok=True)
    status = "PASS" if test_res["code"] == 0 else "FAIL"
    conf = ai_confidence(ai_notes)
    out = REPORTS / "executive_report.html"

    html = f"""
    <html><head><title>ETLQ Executive Report</title>
    <style>
    body {{ font-family: Arial; margin: 24px; background:#f8fafc; color:#0f172a; }}
    .card {{ background:white; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:14px; }}
    .ok {{ color:#166534; }} .bad {{ color:#991b1b; }}
    code {{ background:#eef2ff; padding:2px 6px; border-radius:6px; }}
    pre {{ background:#0b1020; color:#dbeafe; padding:12px; border-radius:8px; overflow:auto; }}
    </style></head><body>
    <h1>ETLQ – Executive Data Quality Report</h1>
    <p><b>Run:</b> {datetime.utcnow().isoformat()} UTC</p>

    <div class='card'>
      <h2>Outcome: <span class='{"ok" if status=="PASS" else "bad"}'>{status}</span></h2>
      <p><b>Email mode:</b> {email_mode}</p>
      <p><b>JUnit:</b> <code>reports/junit.xml</code></p>
      <p><b>AI confidence:</b> {conf}%</p>
    </div>

    <div class='card'>
      <h3>What broke / What changed</h3>
      <pre>{(test_res['stdout'] + '\n' + test_res['stderr'])[-5000:]}</pre>
    </div>

    <div class='card'>
      <h3>AI triage summary</h3>
      <pre>{ai_notes or 'No AI notes generated.'}</pre>
    </div>

    <div class='card'>
      <h3>Next action now</h3>
      <ul>
        <li>Review failed assertions + sample rows</li>
        <li>Run remediation SQL suggested by AI</li>
        <li>Re-run critical suite before promotion</li>
      </ul>
    </div>
    </body></html>
    """
    out.write_text(html, encoding="utf-8")
    return str(out)


def cmd_run(args):
    env = None
    if args.email_mode:
        import os
        env = os.environ.copy()
        env["EMAIL_MODE"] = args.email_mode

    test_res = run_cmd(["python3", "scripts/run_and_email.py"], env=env)

    ai_file = REPORTS / "ai_remediation.md"
    ai_notes = ai_file.read_text(encoding="utf-8") if ai_file.exists() else ""
    exec_report = build_exec_report(test_res, ai_notes, args.email_mode)

    summary = {
        "status": "PASS" if test_res["code"] == 0 else "FAIL",
        "junit": "reports/junit.xml",
        "ai_notes": "reports/ai_remediation.md" if ai_file.exists() else None,
        "executive_report": exec_report,
    }
    print(json.dumps(summary, indent=2))
    raise SystemExit(test_res["code"])


def main():
    ap = argparse.ArgumentParser(description="ETLQ - insanely simple ETL quality CLI")
    sub = ap.add_subparsers(required=True)

    run = sub.add_parser("run", help="Run tests, AI triage, email, and executive report")
    run.add_argument("--email-mode", default="on_fail", choices=["never", "on_fail", "always"])
    run.set_defaults(func=cmd_run)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
