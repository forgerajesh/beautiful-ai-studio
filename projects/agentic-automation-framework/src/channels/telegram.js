const BASE = "https://api.telegram.org";

async function tg(token, method, payload = {}) {
  const res = await fetch(`${BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  return data.result;
}

export async function sendTelegramMessage({ token, chatId, text }) {
  if (!token || !chatId) return;
  return tg(token, "sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
}

export async function pollTelegramUpdates({ token, offset = 0, timeout = 30 }) {
  if (!token) return [];
  return tg(token, "getUpdates", { offset, timeout });
}

export function parseTelegramCommand(update) {
  const msg = update?.message;
  if (!msg?.text) return null;
  return {
    updateId: update.update_id,
    text: msg.text.trim(),
    chatId: String(msg.chat.id),
    userId: String(msg.from?.id || "")
  };
}
