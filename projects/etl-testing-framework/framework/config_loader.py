import re
from pathlib import Path
import yaml
from .models import TestCase


_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}")


def _load_yaml_if_exists(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _build_context(config_dir: Path) -> dict:
    # supports config/entities.yaml + config/business_rules.yaml
    ctx = {}
    for name in ["entities.yaml", "business_rules.yaml"]:
        raw = _load_yaml_if_exists(config_dir / name)
        for k, v in raw.items():
            if isinstance(v, dict):
                for kk, vv in v.items():
                    ctx[f"{k}.{kk}"] = vv
    return ctx


def _render_str(value: str, context: dict) -> str:
    # multi-pass to support nested placeholders
    out = value
    for _ in range(5):
        changed = False

        def repl(m):
            nonlocal changed
            key = m.group(1)
            if key in context:
                changed = True
                return str(context[key])
            return m.group(0)

        out2 = _PATTERN.sub(repl, out)
        out = out2
        if not changed:
            break
    return out


def _render_obj(obj, context: dict):
    if isinstance(obj, str):
        return _render_str(obj, context)
    if isinstance(obj, list):
        return [_render_obj(x, context) for x in obj]
    if isinstance(obj, dict):
        return {k: _render_obj(v, context) for k, v in obj.items()}
    return obj


def load_suite(path: str) -> dict:
    p = Path(path)
    with open(p, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    context = _build_context(p.parent)
    raw = _render_obj(raw, context)

    tests = []
    for t in raw.get("tests", []):
        tests.append(
            TestCase(
                id=t["id"],
                type=t["type"],
                severity=t.get("severity", "medium"),
                params=t.get("params", {}),
                tags=t.get("tags", []),
            )
        )
    raw["tests"] = tests
    raw["_context"] = context
    return raw
