def evaluate_policy(input_data: dict):
    """Lightweight policy-as-code style gate evaluator.
    Rules can be expanded or replaced by OPA in future.
    """
    counts = input_data.get("counts", {})
    fail = int(counts.get("fail", 0))
    err = int(counts.get("error", 0))
    critical_security = int(input_data.get("critical_security_failures", 0))

    violations = []
    if critical_security > 0:
        violations.append("critical_security_block")
    if err > 0:
        violations.append("execution_errors_present")
    if fail > 3:
        violations.append("too_many_failures")

    decision = "ALLOW" if not violations else "DENY"
    return {"decision": decision, "violations": violations, "input": input_data}
