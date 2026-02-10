import re
from pathlib import Path
from framework.checks.base import SecurityCheck
from framework.models import Target, CheckSpec, Finding


PATTERNS = {
    "aws_access_key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "private_key": re.compile(r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "generic_api_key": re.compile(r"(?i)(api[_-]?key|token|secret)\s*[:=]\s*['\"][A-Za-z0-9_\-]{16,}['\"]"),
}


class SecretsScanCheck(SecurityCheck):
    def run(self, target: Target, spec: CheckSpec) -> Finding:
        roots = [Path(p) for p in spec.params.get("paths", ["."])]
        excludes = set(spec.params.get("exclude", []))
        hits = []

        for root in roots:
            for fp in root.rglob("*"):
                if any(part in excludes for part in fp.parts):
                    continue
                if not fp.is_file():
                    continue
                if fp.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".db"}:
                    continue
                try:
                    text = fp.read_text(encoding="utf-8", errors="ignore")
                except Exception:
                    continue
                for name, rx in PATTERNS.items():
                    if rx.search(text):
                        hits.append({"file": str(fp), "pattern": name})
                        if len(hits) >= 20:
                            break
                if len(hits) >= 20:
                    break
            if len(hits) >= 20:
                break

        if hits:
            return Finding(spec.id, target.id, spec.severity, "FAIL", f"Potential secrets found ({len(hits)})", {"hits": hits})
        return Finding(spec.id, target.id, spec.severity, "PASS", "No obvious secrets found")
