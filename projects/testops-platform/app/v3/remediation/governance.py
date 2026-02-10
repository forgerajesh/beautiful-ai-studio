def propose_remediation(findings: list[dict]):
    actions = []
    for f in findings:
        if f.get("status") in ("FAIL", "ERROR"):
            actions.append({
                "target": f.get("check_id", "unknown"),
                "domain": f.get("domain", "unknown"),
                "proposal": "rerun_with_self_healing" if f.get("domain") == "functional" else "create_ticket",
                "requires_approval": True,
            })
    return actions


def apply_remediation(actions: list[dict], approved: bool):
    if not approved:
        return {"applied": 0, "status": "PENDING_APPROVAL"}
    return {"applied": len(actions), "status": "APPLIED"}
