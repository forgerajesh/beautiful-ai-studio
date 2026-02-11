import requests

from app.channels.base import ChannelAdapter


class TeamsAdapter(ChannelAdapter):
    name = "teams"

    def __init__(self, webhook_url: str = ""):
        self.webhook_url = webhook_url

    def send(self, chat_id: str, text: str):
        # For Teams, chat_id can optionally carry an incoming webhook URL override.
        target = chat_id if chat_id.startswith("http") else self.webhook_url
        if not target:
            return None
        r = requests.post(target, json={"text": text}, timeout=30)
        if r.status_code >= 300:
            raise RuntimeError(f"Teams send failed: {r.status_code} {r.text[:200]}")
        return {"ok": True, "status_code": r.status_code, "body": r.text[:200]}
