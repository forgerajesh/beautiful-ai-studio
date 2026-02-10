def plan_agents_from_goal(goal: str) -> list[str]:
    g = (goal or "").lower()
    agents = []

    if any(k in g for k in ["ui", "e2e", "playwright", "journey", "checkout", "login"]):
        agents.append("playwright")
    if any(k in g for k in ["api", "backend", "contract", "service"]):
        agents.append("api")
    if any(k in g for k in ["performance", "latency", "load", "stress", "non functional"]):
        agents.append("non_functional")
    if any(k in g for k in ["security", "owasp", "vuln", "sast", "dast"]):
        agents.append("security")
    if any(k in g for k in ["a11y", "accessibility", "wcag"]):
        agents.append("accessibility")

    if not agents:
        agents = ["playwright", "api", "non_functional", "security", "accessibility"]

    # de-dup preserve order
    out = []
    for a in agents:
        if a not in out:
            out.append(a)
    return out
