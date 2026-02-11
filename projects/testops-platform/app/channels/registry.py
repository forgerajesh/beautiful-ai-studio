from app.channels.telegram import TelegramAdapter
from app.channels.slack import SlackAdapter
from app.channels.discord import DiscordAdapter
from app.channels.teams import TeamsAdapter
from app.channels.whatsapp import WhatsAppAdapter
from app.channels.signal import SignalAdapter


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
        self.teams = TeamsAdapter(channels.get("teams", {}).get("webhook_url", ""))
        self.whatsapp = WhatsAppAdapter(
            token=channels.get("whatsapp", {}).get("access_token", ""),
            phone_number_id=channels.get("whatsapp", {}).get("phone_number_id", ""),
            api_version=channels.get("whatsapp", {}).get("api_version", "v20.0"),
        )
        self.signal = SignalAdapter(bridge_url=channels.get("signal", {}).get("bridge_url", ""))

    def get(self, name: str):
        if name == "telegram":
            return self.telegram
        if name == "slack":
            return self.slack
        if name == "discord":
            return self.discord
        if name == "teams":
            return self.teams
        if name == "whatsapp":
            return self.whatsapp
        if name == "signal":
            return self.signal
        return None
