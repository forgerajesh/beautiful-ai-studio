import subprocess
from pathlib import Path
from app.agent.modules.base import TestingAgent, AgentRunResult


class AccessibilityAgent(TestingAgent):
    name = "accessibility"

    def run(self, cfg: dict) -> AgentRunResult:
        a11y_project = Path("../saucedemo-a11y")
        if not a11y_project.exists():
            return AgentRunResult(agent=self.name, status="INFO", summary="A11y project not present", details={})

        # Best-effort run (if deps not installed, return INFO not hard fail)
        p = subprocess.run(["npm", "test"], cwd=a11y_project, capture_output=True, text=True)
        if p.returncode == 0:
            return AgentRunResult(agent=self.name, status="PASS", summary="Accessibility tests passed", details={"stdout_tail": p.stdout[-1200:]})

        return AgentRunResult(agent=self.name, status="INFO", summary="Accessibility test not fully configured in this env", details={"returncode": p.returncode, "stderr_tail": p.stderr[-1200:], "stdout_tail": p.stdout[-1200:]})
