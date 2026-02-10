from pathlib import Path
import json


def apply_selector_fallbacks(workflow_path: str) -> str:
    """Best-effort selector healing for known common patterns.
    Creates a healed workflow copy and returns its path.
    """
    p = Path(workflow_path)
    wf = json.loads(p.read_text())

    replacements = {
        "#user-name": "input[name='user-name'], #user-name",
        "#password": "input[name='password'], #password",
        "#login-button": "input[type='submit'], #login-button",
    }

    for step in wf.get("steps", []):
        sel = step.get("selector")
        if sel in replacements:
            step["selector"] = replacements[sel]

    out = p.with_name(p.stem + "-healed.json")
    out.write_text(json.dumps(wf, indent=2), encoding="utf-8")
    return str(out)
