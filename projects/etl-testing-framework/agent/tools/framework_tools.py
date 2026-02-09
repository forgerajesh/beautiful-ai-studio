import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def run_pytest_junit(mark_expr: str | None = None) -> dict:
    reports = ROOT / "reports"
    reports.mkdir(exist_ok=True)
    cmd = ["pytest", "-q", "--junitxml=reports/junit.xml"]
    if mark_expr:
        cmd.extend(["-m", mark_expr])

    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    return {
        "ok": p.returncode == 0,
        "returncode": p.returncode,
        "stdout": p.stdout[-8000:],
        "stderr": p.stderr[-4000:],
        "junit_path": str(ROOT / "reports" / "junit.xml"),
    }


def load_suite_yaml() -> dict:
    import yaml
    p = ROOT / "config" / "tests.yaml"
    with open(p, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def summarize_failures(output: str) -> str:
    lines = [x.strip() for x in output.splitlines() if "FAILED" in x or "AssertionError" in x or "AI_TRIAGE" in x]
    return "\n".join(lines[:30]) if lines else "No explicit failure summary found in output."


def save_remediation_notes(text: str) -> str:
    out = ROOT / "reports" / "ai_remediation.md"
    out.parent.mkdir(exist_ok=True)
    out.write_text(text, encoding="utf-8")
    return str(out)


def to_json(data) -> str:
    return json.dumps(data, indent=2, default=str)
