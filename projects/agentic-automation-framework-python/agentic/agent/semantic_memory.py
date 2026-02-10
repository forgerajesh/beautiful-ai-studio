import json
from pathlib import Path
import requests
from agentic.config import CONFIG

REPORTS = Path("reports")
SEM = REPORTS / "agent-memory-embeddings.json"


def _ensure():
    REPORTS.mkdir(exist_ok=True)


def _load():
    _ensure()
    if not SEM.exists():
        return []
    try:
        return json.loads(SEM.read_text())
    except Exception:
        return []


def _save(items):
    SEM.write_text(json.dumps(items[-200:], indent=2))


def _dot(a, b):
    return sum(x * y for x, y in zip(a, b))


def _norm(a):
    return (_dot(a, a) ** 0.5) or 1.0


def _cos(a, b):
    return _dot(a, b) / (_norm(a) * _norm(b))


def embed_text(text: str):
    key = CONFIG["openai"]["key"]
    if not key:
        return None
    base = CONFIG["openai"]["base_url"].rstrip("/")
    model = CONFIG["openai"]["embed_model"]
    try:
        r = requests.post(
            f"{base}/embeddings",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "input": text},
            timeout=40,
        )
        if not r.ok:
            return None
        return r.json().get("data", [{}])[0].get("embedding")
    except Exception:
        return None


def remember_semantic(item: dict):
    vec = embed_text(f"{item.get('goal','')}\n{item.get('error','')}")
    if not vec:
        return False
    mem = _load()
    mem.append({**item, "embedding": vec})
    _save(mem)
    return True


def relevant_semantic(goal: str, limit=5):
    q = embed_text(goal)
    if not q:
        return []
    mem = _load()
    scored = []
    for m in mem:
        vec = m.get("embedding")
        if not vec:
            continue
        s = _cos(q, vec)
        x = dict(m)
        x["score"] = s
        scored.append(x)
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]
