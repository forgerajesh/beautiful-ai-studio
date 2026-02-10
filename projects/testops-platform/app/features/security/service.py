import json
import subprocess
from pathlib import Path
from app.core.models import Finding


def run_security(cfg: dict) -> list[Finding]:
    findings: list[Finding] = []
    sec = cfg.get("features", {}).get("security", {})
    mode = sec.get("mode", "core")
    project_path = Path(sec.get("project_path", "../security-testing-framework"))

    if not project_path.exists():
        return [Finding("security", "secq", "critical", "ERROR", "Security framework path missing", {"path": str(project_path)})]

    cmd = ["./scripts/secq"] if mode == "core" else ["./scripts/secq", "--full", "--target", "https://example.com"]
    p = subprocess.run(cmd, cwd=project_path, capture_output=True, text=True)

    summary_path = project_path / "reports" / "security_bundle_summary.json"
    total = None
    status = None
    if summary_path.exists():
        try:
            d = json.loads(summary_path.read_text())
            total = d.get("total_findings")
            status = d.get("status")
        except Exception:
            pass

    ok = p.returncode == 0
    findings.append(Finding("security", "secq_bundle", "critical", "PASS" if ok else "FAIL", "Security suite execution completed" if ok else "Security suite reported findings/failures", {"mode": mode, "returncode": p.returncode, "summary_status": status, "total_findings": total, "stdout_tail": p.stdout[-1500:], "stderr_tail": p.stderr[-1500:]}))
    return findings
