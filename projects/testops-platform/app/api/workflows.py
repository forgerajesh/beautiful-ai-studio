from pathlib import Path
import json


def list_workflows() -> list[str]:
    root = Path("../agentic-automation-framework-python/examples")
    if not root.exists():
        return []
    return sorted([str(p) for p in root.glob("*.json")])


def read_workflow(path: str) -> dict:
    p = Path(path)
    return json.loads(p.read_text())
