from framework.checks.tls_certificate import TLSCertificateCheck
from framework.checks.security_headers import SecurityHeadersCheck
from framework.checks.open_redirect import OpenRedirectCheck
from framework.checks.secrets_scan import SecretsScanCheck


REGISTRY = {
    "tls_certificate": TLSCertificateCheck,
    "security_headers": SecurityHeadersCheck,
    "open_redirect": OpenRedirectCheck,
    "secrets_scan": SecretsScanCheck,
}


def get_check(check_type: str):
    if check_type not in REGISTRY:
        raise ValueError(f"Unsupported check type: {check_type}")
    return REGISTRY[check_type]()
