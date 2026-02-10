import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run_tests() -> int:
    reports = ROOT / "reports"
    reports.mkdir(exist_ok=True)
    cmd = ["pytest", "-q", "--junitxml=reports/junit.xml"]
    p = subprocess.run(cmd, cwd=ROOT)
    return p.returncode


def send_email() -> int:
    cmd = ["python", "scripts/send_email_report.py"]
    p = subprocess.run(cmd, cwd=ROOT)
    return p.returncode


def maybe_generate_ai_notes(rc: int):
    if rc == 0:
        return
    # Optional best-effort AI remediation generation
    try:
        subprocess.run([
            "python3", "-m", "agent.run_agent", "--request", "analyze latest failed ETL tests and provide remediation"
        ], cwd=ROOT, check=False)
    except Exception:
        pass


def main():
    mode = os.getenv("EMAIL_MODE", "on_fail").lower()  # on_fail | always | never
    rc = run_tests()
    maybe_generate_ai_notes(rc)

    should_send = (mode == "always") or (mode == "on_fail" and rc != 0)
    if mode == "never":
        should_send = False

    if should_send:
        erc = send_email()
        if erc != 0:
            print("WARN: email sending failed")

    raise SystemExit(rc)


if __name__ == "__main__":
    main()
