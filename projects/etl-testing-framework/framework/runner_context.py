from .config_loader import load_suite
from .adapters.registry import create_adapter
from .ai_assistant import AIAssistant
from .settings import is_ai_enabled, ai_model, ai_base_url


class RunnerContext:
    def __init__(self, cfg_path: str = "config/tests.yaml"):
        self.suite = load_suite(cfg_path)
        self.adapter = create_adapter(self.suite["adapter"])
        self.tests = self.suite["tests"]
        self.ai = AIAssistant(
            enabled=is_ai_enabled(self.suite),
            model=ai_model(self.suite),
            base_url=ai_base_url(self.suite),
        )

    def by_id(self, test_id: str):
        for t in self.tests:
            if t.id == test_id:
                return t
        raise KeyError(f"No test found: {test_id}")
