import fs from "fs";
import path from "path";
import { runWorkflow } from "../playwright/runner.js";
import { sendTelegramMessage } from "../channels/telegram.js";
import { sendWhatsAppMessage } from "../channels/whatsapp.js";
import { env } from "../config/env.js";

export function loadWorkflow(filePath) {
  const p = path.resolve(filePath);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export async function executeWorkflowFile(filePath, { notify = false } = {}) {
  const workflow = loadWorkflow(filePath);
  const result = await runWorkflow(workflow, { headless: env.headless });

  if (notify) {
    const text = result.ok
      ? `✅ [${result.name}] Passed in ${result.durationMs}ms\nURL: ${result.finalUrl}`
      : `❌ [${result.name}] Failed in ${result.durationMs}ms\nError: ${result.error}`;

    await Promise.allSettled([
      sendTelegramMessage({ token: env.telegram.token, chatId: env.telegram.chatId, text }),
      sendWhatsAppMessage({ token: env.whatsapp.token, phoneNumberId: env.whatsapp.phoneNumberId, to: env.whatsapp.to, text })
    ]);
  }

  return result;
}
