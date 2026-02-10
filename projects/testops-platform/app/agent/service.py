import json
import shlex
import subprocess
from pathlib import Path

from app.core.config import load_config
from app.core.orchestrator import run_product_suite
from app.channels.base import ChannelMessage


class AgentService:
    def __init__(self, config_path: str = "config/product.yaml"):
        self.config_path = config_path

    def _summary(self, payload: dict) -> str:
        c = payload.get("counts", {})
        return f"Status={payload.get('status')} | total={c.get('total',0)} pass={c.get('pass',0)} fail={c.get('fail',0)} error={c.get('error',0)}"

    def run_suite(self):
        cfg = load_config(self.config_path)
        findings, report = run_product_suite(cfg)
        status = "PASS" if report["counts"]["fail"] == 0 and report["counts"]["error"] == 0 else "FAIL"
        payload = {
            "status": status,
            "counts": report["counts"],
            "reports": report,
            "findings": [f.__dict__ for f in findings],
        }
        return payload

    def handle(self, msg: ChannelMessage) -> str:
        text = (msg.text or "").strip()
        t = text.lower()

        if t in {"/help", "help", "menu"}:
            return (
                "Commands:\n"
                "/run - run full product test suite\n"
                "/status - last run status (from reports)\n"
                "/ask <goal> - run agentic goal via Playwright agent\n"
                "/channels - list supported channels\n"
                "/dashboard - show report path"
            )

        if t.startswith("/run") or t == "run":
            payload = self.run_suite()
            return self._summary(payload) + f"\nReports: {payload['reports']['html']} | {payload['reports']['json']}"

        if t.startswith("/status"):
            p = Path("reports/summary.json")
            if not p.exists():
                return "No run yet. Use /run first."
            data = json.loads(p.read_text())
            counts = {
                "total": len(data),
                "pass": len([x for x in data if x.get("status") == "PASS"]),
                "fail": len([x for x in data if x.get("status") == "FAIL"]),
                "error": len([x for x in data if x.get("status") == "ERROR"]),
            }
            status = "PASS" if counts["fail"] == 0 and counts["error"] == 0 else "FAIL"
            return self._summary({"status": status, "counts": counts})

        if t.startswith("/dashboard"):
            return "Dashboard: reports/summary.html"

        if t.startswith("/channels"):
            return "Supported channels: telegram, whatsapp, discord, slack, signal, imessage, googlechat, teams, email, sms, webchat"

        if t.startswith("/ask "):
            goal = text[5:].strip()
            if not goal:
                return "Usage: /ask <goal>"
            cmd = [
                "python3",
                "../agentic-automation-framework-python/main.py",
                "--ask",
                goal,
            ]
            p = subprocess.run(cmd, capture_output=True, text=True)
            if p.returncode == 0:
                return "Agent goal completed successfully."
            return f"Agent goal failed. tail: {(p.stderr or p.stdout)[-600:]}"

        return "Unknown command. Use /help"
