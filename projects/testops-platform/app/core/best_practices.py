from app.core.models import Finding


def evaluate_best_practices(cfg: dict, findings: list[Finding]) -> list[Finding]:
    out: list[Finding] = []

    # 1) Mandatory domains enabled
    feats = cfg.get("features", {})
    required = ["functional", "non_functional", "security"]
    missing = [k for k in required if not feats.get(k, {}).get("enabled", False)]
    out.append(
        Finding(
            domain="quality_governance",
            check_id="domains_enabled",
            severity="high",
            status="PASS" if not missing else "FAIL",
            summary="All core test domains enabled" if not missing else f"Missing enabled domains: {missing}",
            details={"required": required, "missing": missing},
        )
    )

    # 2) Critical security gate
    security_fails = [f for f in findings if f.domain == "security" and f.status in ("FAIL", "ERROR")]
    out.append(
        Finding(
            domain="quality_governance",
            check_id="security_gate",
            severity="critical",
            status="PASS" if not security_fails else "FAIL",
            summary="Security gate" if not security_fails else "Security gate blocked by findings",
            details={"security_fail_count": len(security_fails)},
        )
    )

    # 3) Non-functional baseline present
    nf_checks = feats.get("non_functional", {}).get("checks", [])
    has_sla = any(x.get("type") == "http_sla" for x in nf_checks)
    out.append(
        Finding(
            domain="quality_governance",
            check_id="nf_sla_present",
            severity="medium",
            status="PASS" if has_sla else "FAIL",
            summary="Non-functional SLA baseline present" if has_sla else "No non-functional SLA baseline found",
            details={"checks": len(nf_checks)},
        )
    )

    return out
