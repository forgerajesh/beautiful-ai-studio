from framework.checks.registry import get_check
from framework.models import Finding


def run_all(config: dict) -> list[Finding]:
    findings: list[Finding] = []
    targets = config.get("targets", [])
    checks = [c for c in config.get("checks", []) if c.enabled]

    for target in targets:
        for spec in checks:
            check = get_check(spec.type)
            finding = check.run(target, spec)
            findings.append(finding)
    return findings
