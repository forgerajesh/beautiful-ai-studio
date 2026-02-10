from app.agent.modules.base import TestingAgent, AgentRunResult
from app.features.security.service import run_security


class SecurityAgent(TestingAgent):
    name = "security"

    def run(self, cfg: dict) -> AgentRunResult:
        findings = run_security(cfg)
        fail = [f for f in findings if f.status in ("FAIL", "ERROR")]
        status = "PASS" if not fail else "FAIL"
        return AgentRunResult(
            agent=self.name,
            status=status,
            summary=f"Security checks executed: {len(findings)}",
            details={"findings": [x.__dict__ for x in findings]},
        )
