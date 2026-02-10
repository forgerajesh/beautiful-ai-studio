import argparse
import json
import subprocess
from pathlib import Path
from datetime import datetime, UTC

ROOT = Path(__file__).resolve().parents[1]
REPORTS = ROOT / "reports"
HISTORY = REPORTS / "history.json"


def run_cmd(cmd, env=None):
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env=env)
    return {"code": p.returncode, "stdout": p.stdout, "stderr": p.stderr}


def ai_confidence(ai_text: str) -> int:
    if not ai_text:
        return 20
    score = 50
    l = ai_text.lower()
    if "root cause" in l:
        score += 15
    if "sql" in l:
        score += 15
    if "fix" in l or "remediation" in l:
        score += 15
    return min(score, 95)


def parse_test_counts(out: str) -> dict:
    # naive parse from pytest summary
    text = out.lower()
    failed = passed = errors = 0
    for token in text.replace(',', ' ').split():
        if token.endswith('failed'):
            try:
                failed = int(token.replace('failed', ''))
            except Exception:
                pass
    # fallback patterns
    import re
    m = re.search(r"(\d+) failed", text)
    if m:
        failed = int(m.group(1))
    m = re.search(r"(\d+) passed", text)
    if m:
        passed = int(m.group(1))
    m = re.search(r"(\d+) error", text)
    if m:
        errors = int(m.group(1))
    total = passed + failed + errors
    return {"total": total, "passed": passed, "failed": failed, "errors": errors}


def load_history() -> list:
    if HISTORY.exists():
        try:
            return json.loads(HISTORY.read_text(encoding="utf-8"))
        except Exception:
            return []
    return []


def save_history(items: list):
    REPORTS.mkdir(exist_ok=True)
    HISTORY.write_text(json.dumps(items[-50:], indent=2), encoding="utf-8")


def build_exec_report(test_res, ai_notes, email_mode, brand="ETLQ"):  # returns path, metrics
    REPORTS.mkdir(exist_ok=True)
    status = "PASS" if test_res["code"] == 0 else "FAIL"
    conf = ai_confidence(ai_notes)

    merged = (test_res.get("stdout", "") + "\n" + test_res.get("stderr", ""))
    counts = parse_test_counts(merged)

    history = load_history()
    now = datetime.now(UTC).isoformat()
    current = {
        "ts": now,
        "status": status,
        "failed": counts["failed"],
        "passed": counts["passed"],
        "total": counts["total"],
    }
    prev = history[-1] if history else None
    history.append(current)
    save_history(history)

    delta_failed = None if not prev else current["failed"] - prev.get("failed", 0)

    out = REPORTS / "executive_report.html"

    html = f"""
    <html><head><title>{brand} Executive Report</title>
    <style>
    body {{ font-family: Inter, Arial; margin: 24px; background:#f1f5f9; color:#0f172a; }}
    .top {{ display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; }}
    .logo {{ font-size:28px; font-weight:800; color:#111827; letter-spacing:.5px; }}
    .badge {{ background:#2563eb; color:white; padding:8px 12px; border-radius:999px; font-size:12px; }}
    .grid {{ display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; margin-bottom:12px; }}
    .card {{ background:white; border:1px solid #e2e8f0; border-radius:12px; padding:14px; }}
    .k {{ font-size:12px; color:#64748b; }} .v {{ font-size:24px; font-weight:700; }}
    .ok {{ color:#166534; }} .bad {{ color:#991b1b; }}
    code {{ background:#eef2ff; padding:2px 6px; border-radius:6px; }}
    pre {{ background:#0b1020; color:#dbeafe; padding:12px; border-radius:8px; overflow:auto; white-space:pre-wrap; }}
    </style></head><body>
    <div class='top'>
      <div class='logo'>{brand}</div>
      <div class='badge'>Executive Data Quality Report</div>
    </div>
    <p><b>Run:</b> {now} UTC</p>

    <div class='grid'>
      <div class='card'><div class='k'>Outcome</div><div class='v {"ok" if status=="PASS" else "bad"}'>{status}</div></div>
      <div class='card'><div class='k'>Total Tests</div><div class='v'>{counts['total']}</div></div>
      <div class='card'><div class='k'>Failed</div><div class='v {"bad" if counts['failed'] else "ok"}'>{counts['failed']}</div></div>
      <div class='card'><div class='k'>AI Confidence</div><div class='v'>{conf}%</div></div>
    </div>

    <div class='card'>
      <h3>Since last run</h3>
      <p>Failed delta: <b>{'N/A' if delta_failed is None else ('+'+str(delta_failed) if delta_failed>0 else str(delta_failed))}</b></p>
      <p><b>Email mode:</b> {email_mode} | <b>JUnit:</b> <code>reports/junit.xml</code></p>
    </div>

    <div class='card'>
      <h3>What broke / changed</h3>
      <pre>{merged[-5000:]}</pre>
    </div>

    <div class='card'>
      <h3>AI triage summary</h3>
      <pre>{ai_notes or 'No AI notes generated.'}</pre>
    </div>

    <div class='card'>
      <h3>Next actions</h3>
      <ul>
        <li>Review failed assertions + sampled rows</li>
        <li>Apply remediation SQL from AI notes</li>
        <li>Re-run critical suite before promotion</li>
      </ul>
    </div>
    </body></html>
    """
    out.write_text(html, encoding="utf-8")
    return str(out), current, prev


def export_pdf_from_html(html_path: str) -> str | None:
    # best-effort PDF export if browser exists
    pdf = str(Path(html_path).with_suffix('.pdf'))
    cmd = [
        "bash", "-lc",
        f"(which chromium || which google-chrome || which chrome) >/dev/null 2>&1 && "
        f"$(which chromium || which google-chrome || which chrome) --headless --disable-gpu --no-sandbox --print-to-pdf={pdf} file://{html_path}"
    ]
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    return pdf if p.returncode == 0 and Path(pdf).exists() else None


def cmd_run(args):
    env = None
    if args.email_mode:
        import os
        env = os.environ.copy()
        env["EMAIL_MODE"] = args.email_mode

    test_res = run_cmd(["python3", "scripts/run_and_email.py"], env=env)

    ai_file = REPORTS / "ai_remediation.md"
    ai_notes = ai_file.read_text(encoding="utf-8") if ai_file.exists() else ""
    exec_report, current, prev = build_exec_report(test_res, ai_notes, args.email_mode, brand=args.brand)
    pdf = export_pdf_from_html(exec_report) if args.pdf else None

    summary = {
        "status": "PASS" if test_res["code"] == 0 else "FAIL",
        "junit": "reports/junit.xml",
        "ai_notes": "reports/ai_remediation.md" if ai_file.exists() else None,
        "executive_report": exec_report,
        "executive_pdf": pdf,
        "since_last_run": {
            "current": current,
            "previous": prev,
        },
    }
    print(json.dumps(summary, indent=2))
    raise SystemExit(test_res["code"])


def main():
    ap = argparse.ArgumentParser(description="ETLQ - insanely simple ETL quality CLI")
    sub = ap.add_subparsers(required=True)

    run = sub.add_parser("run", help="Run tests, AI triage, email, and executive report")
    run.add_argument("--email-mode", default="on_fail", choices=["never", "on_fail", "always"])
    run.add_argument("--brand", default="ETLQ")
    run.add_argument("--pdf", action="store_true", help="Try exporting executive report to PDF")
    run.set_defaults(func=cmd_run)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
