import time
from app.agent.service import AgentService
from app.channels.registry import ChannelRegistry


def run_telegram_listener(config_path: str = "config/product.yaml"):
    from app.core.config import load_config

    cfg = load_config(config_path)
    reg = ChannelRegistry(cfg)
    tg = reg.get("telegram")
    if not tg or not tg.token:
        raise RuntimeError("Telegram bot token not configured")

    agent = AgentService(config_path=config_path)
    while True:
        messages = tg.poll()
        for m in messages:
            reply = agent.handle(m)
            if reply:
                try:
                    tg.send(m.chat_id, reply)
                except Exception:
                    pass
        time.sleep(1)
