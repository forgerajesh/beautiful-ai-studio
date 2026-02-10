from pathlib import Path
from datetime import datetime, UTC


def _write(path: str, content: str):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return str(p)


def generate_testcases(product_name: str, out_dir: str = "artifacts"):
    ts = datetime.now(UTC).isoformat()
    content = f"""# {product_name} - Test Cases\n\nGenerated: {ts}\n\n## Functional\n- TC-F-001: Login success with valid credentials\n- TC-F-002: Login failure with invalid credentials\n- TC-F-003: Critical user journey completes\n\n## API\n- TC-A-001: Health endpoint returns 200\n- TC-A-002: Auth-protected endpoint enforces RBAC\n\n## Non-Functional\n- TC-NF-001: P95 latency within SLA\n- TC-NF-002: Light load stability\n\n## Security\n- TC-S-001: Missing security headers detection\n- TC-S-002: Secrets scan blocks leak\n\n## Accessibility\n- TC-AX-001: Core pages pass WCAG smoke checks\n"""
    return _write(f"{out_dir}/TESTCASES.md", content)


def generate_testplan(product_name: str, out_dir: str = "artifacts"):
    ts = datetime.now(UTC).isoformat()
    content = f"""# {product_name} - Test Plan\n\nGenerated: {ts}\n\n## Scope\n- Functional, API, Non-Functional, Security, Accessibility\n\n## Entry Criteria\n- Build deployed to target environment\n- Test data prepared\n\n## Exit Criteria\n- No critical defects\n- Release decision: GO or approved CONDITIONAL_GO\n\n## Execution Model\n- Agentic orchestration with distributed runners\n- Self-healing retries for UI workflows\n\n## Reporting\n- Unified reports + benchmark history + audit trail\n"""
    return _write(f"{out_dir}/TESTPLAN.md", content)


def generate_teststrategy(product_name: str, out_dir: str = "artifacts"):
    ts = datetime.now(UTC).isoformat()
    content = f"""# {product_name} - Test Strategy\n\nGenerated: {ts}\n\n## Strategy Pillars\n1. Risk-based test prioritization\n2. Shift-left security and quality gates\n3. Continuous agentic execution\n4. Governed remediation with approvals\n5. Observability and benchmark-led improvements\n\n## Automation Architecture\n- Multi-agent model: playwright, api, non_functional, security, accessibility\n- Channel-driven operations and webhook ingress\n- RBAC and tenant-aware configuration\n\n## Release Governance\n- GO / CONDITIONAL_GO / NO_GO decision engine\n- Mandatory blocker on critical security failures\n"""
    return _write(f"{out_dir}/TESTSTRATEGY.md", content)
