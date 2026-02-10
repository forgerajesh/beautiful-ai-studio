"""
MCP server for ETL Testing Framework.
Exposes framework operations as MCP tools.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Optional

from mcp.server.fastmcp import FastMCP

ROOT = Path(__file__).resolve().parents[1]

mcp = FastMCP("etl-testing-framework")


def _run(cmd: list[str]) -> dict:
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    return {
        "ok": p.returncode == 0,
        "returncode": p.returncode,
        "stdout": p.stdout[-12000:],
        "stderr": p.stderr[-6000:],
    }


@mcp.tool()
def health() -> str:
    """Health check for MCP server and framework path."""
    return json.dumps(
        {
            "server": "etl-testing-framework-mcp",
            "root": str(ROOT),
            "exists": ROOT.exists(),
        },
        indent=2,
    )


@mcp.tool()
def run_etl_tests(mark_expr: Optional[str] = None) -> str:
    """Run pytest ETL tests and generate JUnit report."""
    reports = ROOT / "reports"
    reports.mkdir(exist_ok=True)

    cmd = ["pytest", "-q", "--junitxml=reports/junit.xml"]
    if mark_expr:
        cmd.extend(["-m", mark_expr])

    result = _run(cmd)
    result["junit_path"] = str(ROOT / "reports" / "junit.xml")
    return json.dumps(result, indent=2)


@mcp.tool()
def generate_tests_from_metadata() -> str:
    """Generate tests from schema + lineage metadata."""
    cmd = ["python", "-m", "agent.generate_tests"]
    result = _run(cmd)
    result["generated_yaml"] = str(ROOT / "agent" / "generated" / "generated_tests.yaml")
    return json.dumps(result, indent=2)


@mcp.tool()
def run_ai_agent(request: str) -> str:
    """Run LangGraph AI ETL agent with a request string."""
    cmd = ["python", "-m", "agent.run_agent", "--request", request]
    result = _run(cmd)
    result["ai_notes"] = str(ROOT / "reports" / "ai_remediation.md")
    result["junit_path"] = str(ROOT / "reports" / "junit.xml")
    return json.dumps(result, indent=2)



@mcp.tool()
def send_results_email() -> str:
    """Send ETL test results to configured Gmail/SMTP recipient."""
    cmd = ["python", "scripts/send_email_report.py"]
    result = _run(cmd)
    return json.dumps(result, indent=2)

@mcp.tool()
def show_suite_config() -> str:
    """Return active tests.yaml content."""
    p = ROOT / "config" / "tests.yaml"
    if not p.exists():
        return json.dumps({"ok": False, "error": "config/tests.yaml not found"}, indent=2)
    return p.read_text(encoding="utf-8")


if __name__ == "__main__":
    mcp.run()
