from pathlib import Path
import json

STORE = Path("channels-config.json")


def _default():
    return {
        "tenants": {
            "default": {
                "channels": {
                    "telegram": {"enabled": True, "bot_token": "", "chat_id": ""},
                    "whatsapp": {"enabled": False, "access_token": "", "phone_number_id": "", "to": ""},
                    "slack": {"enabled": False, "bot_token": "", "channel": ""},
                    "discord": {"enabled": False, "bot_token": "", "channel_id": ""},
                    "signal": {"enabled": False},
                    "imessage": {"enabled": False},
                    "googlechat": {"enabled": False},
                    "teams": {"enabled": False},
                    "email": {"enabled": False, "smtp_host": "", "to": ""},
                    "sms": {"enabled": False},
                    "webchat": {"enabled": True},
                }
            }
        }
    }


def load_store():
    if not STORE.exists():
        data = _default()
        STORE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        return data
    return json.loads(STORE.read_text())


def save_store(data: dict):
    STORE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def list_tenants():
    return list(load_store().get("tenants", {}).keys())


def get_tenant(tenant_id: str):
    s = load_store()
    return s.get("tenants", {}).get(tenant_id)


def upsert_tenant(tenant_id: str, payload: dict):
    s = load_store()
    s.setdefault("tenants", {})[tenant_id] = payload
    save_store(s)
    return s["tenants"][tenant_id]
