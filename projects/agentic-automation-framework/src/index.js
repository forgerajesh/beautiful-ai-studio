import fs from "fs";
import { env } from "./config/env.js";
import { log, err } from "./utils/logger.js";
import { executeWorkflowFile } from "./agent/engine.js";
import { pollTelegramUpdates, parseTelegramCommand, sendTelegramMessage } from "./channels/telegram.js";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const workflow = arg("--workflow");
const notify = process.argv.includes("--notify");
const telegramListen = process.argv.includes("--telegram-listen");

async function runOnce() {
  if (!workflow) throw new Error("Missing --workflow <file>");
  const result = await executeWorkflowFile(workflow, { notify });
  log("Result:", JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

async function runTelegramListener() {
  if (!env.telegram.token) throw new Error("TELEGRAM_BOT_TOKEN missing");
  log("Telegram listener started. Command format: /run <workflow-json-path>");

  let offset = 0;
  while (true) {
    const updates = await pollTelegramUpdates({ token: env.telegram.token, offset, timeout: 30 });

    for (const upd of updates) {
      offset = upd.update_id + 1;
      const cmd = parseTelegramCommand(upd);
      if (!cmd) continue;

      if (env.telegram.allowedUserIds.length && !env.telegram.allowedUserIds.includes(cmd.userId)) {
        await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: "Unauthorized user." });
        continue;
      }

      if (!cmd.text.startsWith("/run ")) {
        await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: "Use: /run <workflow-file>" });
        continue;
      }

      const wf = cmd.text.replace("/run ", "").trim();
      if (!fs.existsSync(wf)) {
        await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: `Workflow not found: ${wf}` });
        continue;
      }

      await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: `Running workflow: ${wf}` });
      const result = await executeWorkflowFile(wf, { notify: true });
      const text = result.ok
        ? `✅ ${result.name} passed in ${result.durationMs}ms`
        : `❌ ${result.name} failed: ${result.error}`;
      await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text });
    }
  }
}

(async () => {
  try {
    if (telegramListen) await runTelegramListener();
    else await runOnce();
  } catch (e) {
    err(e);
    process.exit(1);
  }
})();
