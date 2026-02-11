from app.channels.telegram import TelegramAdapter
from app.channels.slack import SlackAdapter
from app.channels.discord import DiscordAdapter


class ChannelRegistry:
    """
    OpenClaw-style multi-channel registry.
    Implemented now: telegram (native), generic webhook channels (via API endpoint).
    Planned channels list is exposed for product-level readiness.
    """

    SUPPORTED_CHANNELS = [
        "telegram",
        "whatsapp",
        "discord",
        "slack",
        "signal",
        "imessage",
        "googlechat",
        "teams",
        "email",
        "sms",
        "webchat",
    ]

    def __init__(self, cfg: dict):
        self.cfg = cfg
        channels = cfg.get("agent", {}).get("channels", {})
        self.telegram = TelegramAdapter(channels.get("telegram", {}).get("bot_token", ""))
        self.slack = SlackAdapter(channels.get("slack", {}).get("bot_token", ""))
        self.discord = DiscordAdapter(channels.get("discord", {}).get("bot_token", ""))

    def get(self, name: str):
        if name == "telegram":
            return self.telegram
        if name == "slack":
            return self.slack
        if name == "discord":
            return self.discord
        return None
