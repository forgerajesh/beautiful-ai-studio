from pathlib import Path


def list_artifacts():
    root = Path("artifacts")
    if not root.exists():
        return []
    return sorted([str(p) for p in root.glob("*.md")])


def read_artifact(path: str):
    p = Path(path)
    if not p.exists():
        return {"ok": False, "error": "file not found"}
    if p.suffix.lower() not in {".md", ".txt", ".json"}:
        return {"ok": False, "error": "unsupported file type"}
    return {"ok": True, "path": str(p), "content": p.read_text(encoding="utf-8")[:100000]}
