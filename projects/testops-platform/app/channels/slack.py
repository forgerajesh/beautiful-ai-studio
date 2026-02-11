import requests
from app.channels.base import ChannelAdapter


class SlackAdapter(ChannelAdapter):
    name = "slack"

    def __init__(self, bot_token: str = ""):
        self.bot_token = bot_token

    def send(self, chat_id: str, text: str):
        if not self.bot_token or not chat_id:
            return None
        r = requests.post(
            "https://slack.com/api/chat.postMessage",
            headers={"Authorization": f"Bearer {self.bot_token}", "Content-Type": "application/json"},
            json={"channel": chat_id, "text": text},
            timeout=30,
        )
        data = r.json()
        if not data.get("ok"):
            raise RuntimeError(f"Slack send failed: {data}")
        return data
