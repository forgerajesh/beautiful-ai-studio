from dataclasses import dataclass
from typing import Optional


@dataclass
class ChannelMessage:
    channel: str
    user_id: str
    chat_id: str
    text: str
    raw: dict


class ChannelAdapter:
    name: str = "base"

    def send(self, chat_id: str, text: str) -> Optional[dict]:
        raise NotImplementedError

    def poll(self):
        return []
