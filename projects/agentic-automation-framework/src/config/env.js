import dotenv from "dotenv";
dotenv.config();

export const env = {
  headless: (process.env.HEADLESS ?? "true").toLowerCase() === "true",
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || "",
    chatId: process.env.TELEGRAM_CHAT_ID || "",
    allowedUserIds: (process.env.TELEGRAM_ALLOWED_USER_IDS || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
  },
  whatsapp: {
    token: process.env.WHATSAPP_ACCESS_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    to: process.env.WHATSAPP_TO || ""
  }
};
