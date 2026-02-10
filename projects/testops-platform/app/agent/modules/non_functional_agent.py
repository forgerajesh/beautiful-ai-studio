from app.agent.modules.base import TestingAgent, AgentRunResult
from app.features.non_functional.service import run_non_functional


class NonFunctionalAgent(TestingAgent):
    name = "non_functional"

    def run(self, cfg: dict) -> AgentRunResult:
        findings = run_non_functional(cfg)
        fail = [f for f in findings if f.status in ("FAIL", "ERROR")]
        status = "PASS" if not fail else "FAIL"
        return AgentRunResult(
            agent=self.name,
            status=status,
            summary=f"Non-functional checks executed: {len(findings)}",
            details={"findings": [x.__dict__ for x in findings]},
        )
