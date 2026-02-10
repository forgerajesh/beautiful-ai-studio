import json
import os
import sys
import subprocess
from pathlib import Path
from app.core.models import Finding


def run_functional(cfg: dict) -> list[Finding]:
    findings: list[Finding] = []
    workflows = cfg.get("features", {}).get("functional", {}).get("workflows", [])

    for wf in workflows:
        wf_path = Path(wf)
        if not wf_path.exists():
            findings.append(Finding("functional", wf, "high", "ERROR", "Workflow file missing", {"workflow": wf}))
            continue

        # Reuse existing Python agentic framework runner if present.
        cmd = [
            sys.executable,
            "../agentic-automation-framework-python/main.py",
            "--workflow",
            str(wf_path),
        ]
        env = os.environ.copy()
        env["PYTHONPATH"] = str(Path("../agentic-automation-framework-python").resolve())
        p = subprocess.run(cmd, capture_output=True, text=True, env=env)
        ok = p.returncode == 0
        findings.append(
            Finding(
                "functional",
                f"workflow:{wf_path.name}",
                "high",
                "PASS" if ok else "FAIL",
                "Workflow execution completed" if ok else "Workflow execution failed",
                {"returncode": p.returncode, "stdout_tail": p.stdout[-1200:], "stderr_tail": p.stderr[-1200:]},
            )
        )

    return findings
