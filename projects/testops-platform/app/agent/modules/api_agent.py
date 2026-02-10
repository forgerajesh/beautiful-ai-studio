import requests
from app.agent.modules.base import TestingAgent, AgentRunResult


class APIAgent(TestingAgent):
    name = "api"

    def run(self, cfg: dict) -> AgentRunResult:
        checks = cfg.get("features", {}).get("non_functional", {}).get("checks", [])
        urls = list({c.get("url") for c in checks if c.get("url")})
        if not urls:
            urls = ["https://example.com"]

        results = []
        failed = 0
        for u in urls:
            try:
                r = requests.get(u, timeout=20)
                ok = r.ok
                if not ok:
                    failed += 1
                results.append({"url": u, "status_code": r.status_code, "ok": ok})
            except Exception as e:
                failed += 1
                results.append({"url": u, "ok": False, "error": str(e)})

        status = "PASS" if failed == 0 else "FAIL"
        return AgentRunResult(agent=self.name, status=status, summary=f"API endpoints checked: {len(results)}", details={"results": results})
