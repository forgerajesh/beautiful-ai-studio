import json
import re
from pathlib import Path

REPORTS = Path("reports")
MEM = REPORTS / "agent-memory.json"
SEM = REPORTS / "agent-memory-embeddings.json"


def _ensure():
    REPORTS.mkdir(exist_ok=True)


def load_memory():
    _ensure()
    if not MEM.exists():
        return {"failures": []}
    try:
        return json.loads(MEM.read_text())
    except Exception:
        return {"failures": []}


def record_failure(item: dict):
    m = load_memory()
    m["failures"].append(item)
    m["failures"] = m["failures"][-50:]
    MEM.write_text(json.dumps(m, indent=2))


def recent(limit=5):
    return load_memory().get("failures", [])[-limit:]


def _tokens(s: str):
    return set([t for t in re.sub(r"[^a-z0-9\s]", " ", (s or "").lower()).split() if len(t) > 2])


def _jaccard(a, b):
    inter = len(a.intersection(b))
    union = len(a.union(b)) or 1
    return inter / union


def relevant_lexical(goal: str, limit=5):
    g = _tokens(goal)
    scored = []
    for f in load_memory().get("failures", []):
        txt = f"{f.get('goal','')} {f.get('error','')}"
        s = _jaccard(g, _tokens(txt))
        if s > 0:
            x = dict(f)
            x["score"] = s
            scored.append(x)
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]
