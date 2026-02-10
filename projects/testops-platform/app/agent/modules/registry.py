from app.agent.modules.playwright_agent import PlaywrightAgent
from app.agent.modules.non_functional_agent import NonFunctionalAgent
from app.agent.modules.security_agent import SecurityAgent
from app.agent.modules.api_agent import APIAgent
from app.agent.modules.accessibility_agent import AccessibilityAgent


class AgentRegistry:
    def __init__(self):
        self._agents = {
            "playwright": PlaywrightAgent(),
            "api": APIAgent(),
            "non_functional": NonFunctionalAgent(),
            "security": SecurityAgent(),
            "accessibility": AccessibilityAgent(),
        }

    def list(self):
        return list(self._agents.keys())

    def get(self, name: str):
        return self._agents.get(name)

    def run_all(self, cfg: dict):
        out = []
        for name in self.list():
            out.append(self._agents[name].run(cfg))
        return out
