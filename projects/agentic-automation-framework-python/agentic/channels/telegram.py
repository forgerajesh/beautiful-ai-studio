import requests


BASE = "https://api.telegram.org"


def _call(token: str, method: str, payload: dict):
    r = requests.post(f"{BASE}/bot{token}/{method}", json=payload, timeout=40)
    data = r.json()
    if not data.get("ok"):
        raise RuntimeError(f"Telegram {method} failed: {data}")
    return data["result"]


def send_message(token: str, chat_id: str, text: str):
    if not token or not chat_id:
        return None
    return _call(token, "sendMessage", {"chat_id": chat_id, "text": text, "disable_web_page_preview": True})


def poll_updates(token: str, offset=0, timeout=30):
    if not token:
        return []
    return _call(token, "getUpdates", {"offset": offset, "timeout": timeout})


def parse_command(update: dict):
    msg = update.get("message") or {}
    txt = msg.get("text")
    if not txt:
        return None
    return {
        "update_id": update.get("update_id"),
        "text": txt.strip(),
        "chat_id": str(msg.get("chat", {}).get("id", "")),
        "user_id": str((msg.get("from") or {}).get("id", "")),
    }
