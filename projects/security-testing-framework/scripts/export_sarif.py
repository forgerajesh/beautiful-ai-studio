#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
src = ROOT / "reports" / "security_report.json"
out = ROOT / "sarif" / "security_report.sarif"
out.parent.mkdir(parents=True, exist_ok=True)

if not src.exists():
    print(f"Missing input: {src}")
    raise SystemExit(1)

findings = json.loads(src.read_text(encoding="utf-8"))

results = []
for f in findings:
    if f.get("status") not in ("FAIL", "ERROR"):
        continue
    level = "error" if f.get("severity") == "critical" else "warning"
    results.append({
        "ruleId": f.get("check_id", "security-check"),
        "level": level,
        "message": {"text": f.get("summary", "Security issue detected")},
        "locations": [{
            "physicalLocation": {
                "artifactLocation": {"uri": f.get("target_id", "target")}
            }
        }],
        "properties": {
            "severity": f.get("severity"),
            "details": f.get("details", {}),
        },
    })

sarif = {
    "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
    "version": "2.1.0",
    "runs": [{
        "tool": {"driver": {"name": "SECQ", "version": "1.0.0"}},
        "results": results,
    }],
}

out.write_text(json.dumps(sarif, indent=2), encoding="utf-8")
print(f"SARIF written: {out}")
