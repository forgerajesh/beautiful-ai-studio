import os
import requests

from app.channels.base import ChannelAdapter


class SignalAdapter(ChannelAdapter):
    name = "signal"

    def __init__(self, bridge_url: str = ""):
        self.bridge_url = bridge_url or os.getenv("SIGNAL_BRIDGE_URL", "")

    def send(self, chat_id: str, text: str):
        if not self.bridge_url or not chat_id:
            return None
        r = requests.post(
            self.bridge_url,
            json={"recipient": chat_id, "message": text},
            timeout=20,
        )
        if r.status_code >= 300:
            raise RuntimeError(f"Signal bridge send failed: {r.status_code} {r.text}")
        try:
            return r.json()
        except Exception:
            return {"ok": True, "status_code": r.status_code, "text": r.text}
