def select_agents_by_risk(changed_files: list[str]):
    changed = "\n".join(changed_files).lower()
    agents = []

    if any(x in changed for x in ["ui", "frontend", "playwright", "views", "react"]):
        agents.append("playwright")
    if any(x in changed for x in ["api", "backend", "service", "controller"]):
        agents.append("api")
    if any(x in changed for x in ["infra", "deploy", "docker", "k8s", "terraform"]):
        agents.append("security")
    if any(x in changed for x in ["performance", "latency", "cache", "queue"]):
        agents.append("non_functional")
    if any(x in changed for x in ["a11y", "accessibility", "wcag"]):
        agents.append("accessibility")

    if not agents:
        agents = ["api", "playwright"]

    # dedupe
    out = []
    for a in agents:
        if a not in out:
            out.append(a)
    return out
