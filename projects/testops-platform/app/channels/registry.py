from app.channels.telegram import TelegramAdapter


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
        telegram_token = cfg.get("agent", {}).get("channels", {}).get("telegram", {}).get("bot_token", "")
        self.telegram = TelegramAdapter(telegram_token)

    def get(self, name: str):
        if name == "telegram":
            return self.telegram
        return None
