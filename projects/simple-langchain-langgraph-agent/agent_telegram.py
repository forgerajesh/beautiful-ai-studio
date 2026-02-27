import os
import time
import requests
from dotenv import load_dotenv

from agent import run_once


def send_message(token: str, chat_id: int, text: str):
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=30)


def poll_updates(token: str, offset: int | None = None):
    url = f"https://api.telegram.org/bot{token}/getUpdates"
    params = {"timeout": 30}
    if offset is not None:
        params["offset"] = offset
    r = requests.get(url, params=params, timeout=40)
    r.raise_for_status()
    return r.json().get("result", [])


def main():
    load_dotenv()
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    allowed_chat = os.getenv("TELEGRAM_CHAT_ID")
    if not token:
        raise RuntimeError("Missing TELEGRAM_BOT_TOKEN in .env")

    print("Telegram agent started...")
    offset = None
    while True:
        try:
            updates = poll_updates(token, offset)
            for u in updates:
                offset = u["update_id"] + 1
                msg = u.get("message", {})
                chat_id = msg.get("chat", {}).get("id")
                text = (msg.get("text") or "").strip()
                if not text:
                    continue
                if allowed_chat and str(chat_id) != str(allowed_chat):
                    continue
                if text.lower() in {"/start", "start"}:
                    send_message(token, chat_id, "Agent is online. Ask me anything.")
                    continue
                if text.lower() in {"/plan", "plan"}:
                    send_message(token, chat_id, "Send a question and I will include a plan.")
                    continue

                answer, plan = run_once(text)
                send_message(token, chat_id, f"Plan:\n{plan}\n\nAnswer:\n{answer}")
        except Exception as e:
            print(f"poll error: {e}")
            time.sleep(2)


if __name__ == "__main__":
    main()
