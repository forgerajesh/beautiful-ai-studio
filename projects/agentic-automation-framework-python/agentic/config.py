import os
from dotenv import load_dotenv

load_dotenv()


def _bool(v: str, default=True):
    if v is None:
        return default
    return v.lower() == "true"

CONFIG = {
    "headless": _bool(os.getenv("HEADLESS", "true")),
    "telegram": {
        "token": os.getenv("TELEGRAM_BOT_TOKEN", ""),
        "chat_id": os.getenv("TELEGRAM_CHAT_ID", ""),
        "allowed_user_ids": [x.strip() for x in os.getenv("TELEGRAM_ALLOWED_USER_IDS", "").split(",") if x.strip()],
    },
    "whatsapp": {
        "token": os.getenv("WHATSAPP_ACCESS_TOKEN", ""),
        "phone_number_id": os.getenv("WHATSAPP_PHONE_NUMBER_ID", ""),
        "to": os.getenv("WHATSAPP_TO", ""),
    },
    "openai": {
        "key": os.getenv("OPENAI_API_KEY", ""),
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "base_url": os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
        "embed_model": os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small"),
    },
    "queue": {
        "concurrency": int(os.getenv("RUN_CONCURRENCY", "2")),
        "retries": int(os.getenv("RUN_RETRIES", "1")),
    },
    "agent_max_iterations": int(os.getenv("AGENT_MAX_ITERATIONS", "2")),
    "memory_mode": os.getenv("MEMORY_MODE", "hybrid"),
}
