from dataclasses import dataclass


@dataclass
class ReleaseDecision:
    status: str  # GO | CONDITIONAL_GO | NO_GO
    reason: str
    score: int


def evaluate_release(findings: list[dict], min_score_go: int = 85) -> ReleaseDecision:
    score = 100
    critical_fail = 0
    high_fail = 0

    for f in findings:
        status = f.get("status")
        sev = (f.get("severity") or "").lower()
        if status in ("FAIL", "ERROR"):
            if sev == "critical":
                critical_fail += 1
                score -= 30
            elif sev == "high":
                high_fail += 1
                score -= 15
            elif sev == "medium":
                score -= 8
            else:
                score -= 4

    score = max(0, score)

    if critical_fail > 0:
        return ReleaseDecision("NO_GO", f"Critical failures={critical_fail}", score)
    if score < min_score_go:
        return ReleaseDecision("CONDITIONAL_GO", f"Score {score} below GO threshold {min_score_go}", score)
    if high_fail > 0:
        return ReleaseDecision("CONDITIONAL_GO", f"High failures={high_fail}", score)
    return ReleaseDecision("GO", "Quality gates satisfied", score)
