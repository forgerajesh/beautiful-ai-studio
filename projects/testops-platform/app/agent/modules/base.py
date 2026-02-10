from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class AgentRunResult:
    agent: str
    status: str  # PASS|FAIL|ERROR|INFO
    summary: str
    details: Dict[str, Any]


class TestingAgent:
    name = "base"

    def run(self, cfg: dict) -> AgentRunResult:
        raise NotImplementedError
