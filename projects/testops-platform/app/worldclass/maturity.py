def compute_maturity(findings: list[dict], enabled_channels: int, enabled_agents: int) -> dict:
    total = len(findings) or 1
    pass_rate = len([x for x in findings if x.get("status") == "PASS"]) / total
    fail_rate = len([x for x in findings if x.get("status") in ("FAIL", "ERROR")]) / total

    score = 0
    score += int(pass_rate * 60)
    score += min(enabled_channels, 11) * 2
    score += min(enabled_agents, 8) * 3
    score -= int(fail_rate * 30)
    score = max(0, min(100, score))

    tier = "emerging"
    if score >= 80:
        tier = "elite"
    elif score >= 65:
        tier = "advanced"
    elif score >= 45:
        tier = "growing"

    return {"score": score, "tier": tier, "pass_rate": round(pass_rate, 3), "fail_rate": round(fail_rate, 3)}
