import requests
from typing import List
from app.channels.base import ChannelAdapter, ChannelMessage


class TelegramAdapter(ChannelAdapter):
    name = "telegram"

    def __init__(self, token: str = ""):
        self.token = token
        self.base = f"https://api.telegram.org/bot{token}" if token else ""
        self.offset = 0

    def send(self, chat_id: str, text: str):
        if not self.token or not chat_id:
            return None
        r = requests.post(
            f"{self.base}/sendMessage",
            json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
            timeout=30,
        )
        data = r.json()
        if not data.get("ok"):
            raise RuntimeError(f"Telegram send failed: {data}")
        return data.get("result")

    def poll(self) -> List[ChannelMessage]:
        if not self.token:
            return []
        r = requests.post(f"{self.base}/getUpdates", json={"offset": self.offset, "timeout": 25}, timeout=40)
        data = r.json()
        if not data.get("ok"):
            return []

        out = []
        for upd in data.get("result", []):
            self.offset = max(self.offset, upd.get("update_id", 0) + 1)
            msg = upd.get("message") or {}
            text = msg.get("text")
            if not text:
                continue
            out.append(
                ChannelMessage(
                    channel="telegram",
                    user_id=str((msg.get("from") or {}).get("id", "")),
                    chat_id=str((msg.get("chat") or {}).get("id", "")),
                    text=text.strip(),
                    raw=upd,
                )
            )
        return out
