from pathlib import Path
import json
from app.healing.ai_locator_repair import suggest_selector


def apply_selector_fallbacks(workflow_path: str, dom_excerpt: str = "") -> str:
    """Best-effort selector healing.
    - Uses AI locator repair when available
    - Falls back to deterministic selector map
    Creates a healed workflow copy and returns its path.
    """
    p = Path(workflow_path)
    wf = json.loads(p.read_text())

    for step in wf.get("steps", []):
        sel = step.get("selector")
        if not sel:
            continue
        step["selector"] = suggest_selector(sel, step, dom_excerpt=dom_excerpt)

    out = p.with_name(p.stem + "-healed.json")
    out.write_text(json.dumps(wf, indent=2), encoding="utf-8")
    return str(out)
