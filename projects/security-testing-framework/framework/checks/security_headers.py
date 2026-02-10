import requests
from framework.checks.base import SecurityCheck
from framework.models import Target, CheckSpec, Finding


class SecurityHeadersCheck(SecurityCheck):
    def run(self, target: Target, spec: CheckSpec) -> Finding:
        if not target.base_url:
            return Finding(spec.id, target.id, spec.severity, "ERROR", "Target missing base_url")

        required = spec.params.get("required_headers", [])
        try:
            r = requests.get(target.base_url, timeout=12, allow_redirects=True)
            missing = [h for h in required if h not in r.headers]
            if missing:
                return Finding(
                    spec.id,
                    target.id,
                    spec.severity,
                    "FAIL",
                    f"Missing security headers: {', '.join(missing)}",
                    {"status_code": r.status_code, "missing": missing, "url": r.url},
                )
            return Finding(spec.id, target.id, spec.severity, "PASS", "All required security headers are present", {"status_code": r.status_code, "url": r.url})
        except Exception as e:
            return Finding(spec.id, target.id, spec.severity, "ERROR", f"Header check error: {e}")
