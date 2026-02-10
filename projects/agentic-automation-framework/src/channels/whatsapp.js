export async function sendWhatsAppMessage({ token, phoneNumberId, to, text }) {
  if (!token || !phoneNumberId || !to) return;
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text }
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`WhatsApp send failed: ${JSON.stringify(data)}`);
  return data;
}
