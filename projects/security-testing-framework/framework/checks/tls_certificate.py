import socket
import ssl
from datetime import datetime, UTC
from urllib.parse import urlparse
from framework.checks.base import SecurityCheck
from framework.models import Target, CheckSpec, Finding


class TLSCertificateCheck(SecurityCheck):
    def run(self, target: Target, spec: CheckSpec) -> Finding:
        if not target.base_url:
            return Finding(spec.id, target.id, spec.severity, "ERROR", "Target missing base_url")

        host = urlparse(target.base_url).hostname
        if not host:
            return Finding(spec.id, target.id, spec.severity, "ERROR", "Invalid base_url")

        min_days = int(spec.params.get("min_days_remaining", 14))

        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((host, 443), timeout=10) as sock:
                with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                    cert = ssock.getpeercert()
            not_after = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=UTC)
            days = (not_after - datetime.now(UTC)).days
            if days < min_days:
                return Finding(spec.id, target.id, spec.severity, "FAIL", f"TLS certificate expires soon ({days} days)", {"days_remaining": days, "host": host})
            return Finding(spec.id, target.id, spec.severity, "PASS", f"TLS certificate healthy ({days} days)", {"days_remaining": days, "host": host})
        except Exception as e:
            return Finding(spec.id, target.id, spec.severity, "ERROR", f"TLS check error: {e}", {"host": host})
