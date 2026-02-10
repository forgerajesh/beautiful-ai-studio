from app.agent.modules.base import TestingAgent, AgentRunResult
from app.features.functional.service import run_functional


class PlaywrightAgent(TestingAgent):
    name = "playwright"

    def run(self, cfg: dict) -> AgentRunResult:
        findings = run_functional(cfg)
        fail = [f for f in findings if f.status in ("FAIL", "ERROR")]
        status = "PASS" if not fail else "FAIL"
        return AgentRunResult(
            agent=self.name,
            status=status,
            summary=f"Functional workflows executed: {len(findings)}",
            details={"findings": [x.__dict__ for x in findings]},
        )
