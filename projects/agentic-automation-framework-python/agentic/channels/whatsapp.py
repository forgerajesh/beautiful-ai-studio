import requests


def send_message(token: str, phone_number_id: str, to: str, text: str):
    if not token or not phone_number_id or not to:
        return None
    url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text},
    }
    r = requests.post(url, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"}, json=payload, timeout=30)
    if not r.ok:
        raise RuntimeError(f"WhatsApp failed: {r.text}")
    return r.json()
