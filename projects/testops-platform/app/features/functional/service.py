import json
import os
import sys
import subprocess
from pathlib import Path
from app.core.models import Finding
from app.healing.playwright_healer import apply_selector_fallbacks
from app.healing.engine import run_with_self_healing


def run_functional(cfg: dict) -> list[Finding]:
    findings: list[Finding] = []
    workflows = cfg.get("features", {}).get("functional", {}).get("workflows", [])

    for wf in workflows:
        wf_path = Path(wf)
        if not wf_path.exists():
            findings.append(Finding("functional", wf, "high", "ERROR", "Workflow file missing", {"workflow": wf}))
            continue

        env = os.environ.copy()
        env["PYTHONPATH"] = str(Path("../agentic-automation-framework-python").resolve())

        state = {"healed": False, "attempts": 0, "last": None, "current_workflow": str(wf_path)}

        def _exec_once():
            state["attempts"] += 1
            cmd = [
                sys.executable,
                "../agentic-automation-framework-python/main.py",
                "--workflow",
                state["current_workflow"],
            ]
            p = subprocess.run(cmd, capture_output=True, text=True, env=env)
            state["last"] = p
            if p.returncode != 0 and state["attempts"] == 1:
                # self-heal pass: try selector fallbacks
                healed_path = apply_selector_fallbacks(state["current_workflow"])
                state["current_workflow"] = healed_path
                state["healed"] = True
                raise RuntimeError("initial run failed; applied selector healing")
            if p.returncode != 0:
                raise RuntimeError((p.stderr or p.stdout)[-800:])
            return p

        hr = run_with_self_healing(_exec_once, max_attempts=3, backoff_ms=300)
        p = state["last"]
        ok = hr.ok
        findings.append(
            Finding(
                "functional",
                f"workflow:{wf_path.name}",
                "high",
                "PASS" if ok else "FAIL",
                "Workflow execution completed" if ok else "Workflow execution failed",
                {
                    "healed": state["healed"],
                    "attempts": hr.attempts,
                    "workflow_used": state["current_workflow"],
                    "returncode": getattr(p, "returncode", None),
                    "stdout_tail": (p.stdout[-1200:] if p else ""),
                    "stderr_tail": (p.stderr[-1200:] if p else hr.last_error),
                },
            )
        )

    return findings
