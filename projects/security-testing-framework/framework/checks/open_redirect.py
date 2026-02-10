from urllib.parse import urljoin
import requests
from framework.checks.base import SecurityCheck
from framework.models import Target, CheckSpec, Finding


class OpenRedirectCheck(SecurityCheck):
    def run(self, target: Target, spec: CheckSpec) -> Finding:
        if not target.base_url:
            return Finding(spec.id, target.id, spec.severity, "ERROR", "Target missing base_url")

        probe_paths = spec.params.get("probe_paths", [])
        findings = []
        try:
            for p in probe_paths:
                url = urljoin(target.base_url, p)
                r = requests.get(url, timeout=10, allow_redirects=False)
                loc = r.headers.get("Location", "")
                if r.status_code in (301, 302, 303, 307, 308) and "evil.example" in loc:
                    findings.append({"url": url, "status": r.status_code, "location": loc})

            if findings:
                return Finding(spec.id, target.id, spec.severity, "FAIL", "Potential open redirect behavior detected", {"hits": findings})
            return Finding(spec.id, target.id, spec.severity, "PASS", "No open redirect behavior detected", {"probes": len(probe_paths)})
        except Exception as e:
            return Finding(spec.id, target.id, spec.severity, "ERROR", f"Open redirect check error: {e}")
