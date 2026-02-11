import requests
from app.channels.base import ChannelAdapter


class DiscordAdapter(ChannelAdapter):
    name = "discord"

    def __init__(self, bot_token: str = ""):
        self.bot_token = bot_token

    def send(self, chat_id: str, text: str):
        if not self.bot_token or not chat_id:
            return None
        r = requests.post(
            f"https://discord.com/api/v10/channels/{chat_id}/messages",
            headers={"Authorization": f"Bot {self.bot_token}", "Content-Type": "application/json"},
            json={"content": text},
            timeout=30,
        )
        if r.status_code >= 300:
            raise RuntimeError(f"Discord send failed: {r.status_code} {r.text[:200]}")
        return r.json()
