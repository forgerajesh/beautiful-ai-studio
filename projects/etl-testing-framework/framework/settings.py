import os


def is_ai_enabled(suite_cfg: dict) -> bool:
    return bool(suite_cfg.get("ai", {}).get("enabled", False))


def ai_model(suite_cfg: dict) -> str:
    return suite_cfg.get("ai", {}).get("model", os.getenv("OPENAI_MODEL", "gpt-4o-mini"))


def ai_base_url(suite_cfg: dict) -> str:
    return suite_cfg.get("ai", {}).get("base_url", os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"))
