from pathlib import Path
import yaml
from .models import Target, CheckSpec


def load_config(path: str) -> dict:
    p = Path(path)
    with open(p, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    targets = [Target(**t) for t in raw.get("targets", [])]
    checks = [CheckSpec(**c) for c in raw.get("checks", [])]
    raw["targets"] = targets
    raw["checks"] = checks
    return raw
