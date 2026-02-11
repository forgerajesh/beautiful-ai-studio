import requests

from app.channels.base import ChannelAdapter


class WhatsAppAdapter(ChannelAdapter):
    name = "whatsapp"

    def __init__(self, token: str = "", phone_number_id: str = "", api_version: str = "v20.0"):
        self.token = token
        self.phone_number_id = phone_number_id
        self.api_version = api_version

    def send(self, chat_id: str, text: str):
        if not self.token or not self.phone_number_id or not chat_id:
            return None
        url = f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}/messages"
        r = requests.post(
            url,
            headers={"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"},
            json={
                "messaging_product": "whatsapp",
                "to": chat_id,
                "type": "text",
                "text": {"body": text},
            },
            timeout=30,
        )
        data = r.json()
        if r.status_code >= 300:
            raise RuntimeError(f"WhatsApp send failed: {data}")
        return data
