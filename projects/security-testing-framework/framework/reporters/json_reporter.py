import json
from pathlib import Path
from dataclasses import asdict


def write_json(findings, out_dir: str):
    p = Path(out_dir)
    p.mkdir(parents=True, exist_ok=True)
    out = p / "security_report.json"
    out.write_text(json.dumps([asdict(f) for f in findings], indent=2), encoding="utf-8")
    return str(out)
