import fs from "fs";
import path from "path";
import { env } from "./config/env.js";
import { log, err } from "./utils/logger.js";
import { executeWorkflowFile } from "./agent/engine.js";
import { pollTelegramUpdates, parseTelegramCommand, sendTelegramMessage } from "./channels/telegram.js";
import { generateWorkflow, saveWorkflow } from "./agent/planner.js";
import { appendHistory, buildDashboard } from "./agent/history.js";
import { RunQueue } from "./agent/queue.js";
import { runClaudeLikeAgent } from "./agent/claude_mode.js";
import { recentFailureContext } from "./agent/memory.js";

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const workflow = arg("--workflow");
const notify = process.argv.includes("--notify");
const telegramListen = process.argv.includes("--telegram-listen");
const dashboardOnly = process.argv.includes("--dashboard");
const planPrompt = arg("--plan");
const planOut = arg("--out") || "./examples/generated-workflow.json";
const askPrompt = arg("--ask");

function saveRun(result) {
  appendHistory({
    ts: new Date().toISOString(),
    name: result.name,
    ok: !!result.ok,
    durationMs: result.durationMs,
    finalUrl: result.finalUrl,
    error: result.error || ""
  });
  const dashboard = buildDashboard();
  return dashboard;
}

async function runOnce() {
  if (!workflow) throw new Error("Missing --workflow <file>");
  const result = await executeWorkflowFile(workflow, { notify });
  const dashboard = saveRun(result);
  log("Result:", JSON.stringify(result, null, 2));
  log("Dashboard:", dashboard);
  if (!result.ok) process.exitCode = 1;
}

async function runPlanner() {
  if (!planPrompt) throw new Error("Missing --plan <prompt>");
  const wf = await generateWorkflow(planPrompt);
  const out = path.resolve(planOut);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  saveWorkflow(wf, out);
  log(`Generated workflow: ${out}`);
  log(JSON.stringify(wf, null, 2));
}

async function runAsk() {
  if (!askPrompt) throw new Error("Missing --ask <goal>");
  const result = await runClaudeLikeAgent({ goal: askPrompt, notify });
  log("Agentic result:", JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}

async function runTelegramListener() {
  if (!env.telegram.token) throw new Error("TELEGRAM_BOT_TOKEN missing");

  const queue = new RunQueue({
    worker: async (job) => executeWorkflowFile(job.workflowPath, { notify: true }),
    concurrency: Number(process.env.RUN_CONCURRENCY || 2),
    retries: Number(process.env.RUN_RETRIES || 1),
    onResult: async (result, job) => {
      saveRun(result);
      const text = result.ok
        ? `✅ ${result.name} passed in ${result.durationMs}ms`
        : `❌ ${result.name} failed after retries. Error: ${result.error}`;
      await sendTelegramMessage({ token: env.telegram.token, chatId: job.chatId, text });
    }
  });

  log("Telegram listener started.");
  log("Commands: /run <workflow-path> | /plan <prompt> | /ask <goal> | /memory | /dashboard");

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

      if (cmd.text.startsWith("/run ")) {
        const wf = cmd.text.replace("/run ", "").trim();
        if (!fs.existsSync(wf)) {
          await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: `Workflow not found: ${wf}` });
          continue;
        }
        await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: `Queued: ${wf}` });
        queue.add({ workflowPath: wf, chatId: cmd.chatId, name: wf });
        continue;
      }

      if (cmd.text.startsWith("/plan ")) {
        const prompt = cmd.text.replace("/plan ", "").trim();
        const wf = await generateWorkflow(prompt);
        const out = `./examples/generated-${Date.now()}.json`;
        saveWorkflow(wf, out);
        await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: `Generated workflow: ${out}` });
        continue;
      }

      if (cmd.text.startsWith("/ask ")) {
        const goal = cmd.text.replace("/ask ", "").trim();
        await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: `Agentic run started for: ${goal}` });
        const result = await runClaudeLikeAgent({ goal, notify: true });
        const text = result.ok
          ? `✅ Agent completed in ${result.iterationsUsed} iteration(s). Final URL: ${result.final?.finalUrl || "n/a"}`
          : `❌ Agent failed after ${result.iterationsUsed} iteration(s). Error: ${result.final?.error || "unknown"}`;
        await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text });
        continue;
      }

      if (cmd.text.startsWith("/memory")) {
        const mem = recentFailureContext(5);
        const txt = mem.length
          ? mem.map((m, i) => `${i + 1}. ${m.goal} -> ${m.error}`).join("\n")
          : "No recent failure memory.";
        await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: txt });
        continue;
      }

      if (cmd.text.startsWith("/dashboard")) {
        const p = buildDashboard();
        await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: `Dashboard: ${p}` });
        continue;
      }

      await sendTelegramMessage({ token: env.telegram.token, chatId: cmd.chatId, text: "Use /run <workflow> | /plan <prompt> | /ask <goal> | /memory | /dashboard" });
    }
  }
}

(async () => {
  try {
    if (dashboardOnly) {
      const p = buildDashboard();
      log("Dashboard generated:", p);
      return;
    }
    if (planPrompt) {
      await runPlanner();
      return;
    }
    if (askPrompt) {
      await runAsk();
      return;
    }
    if (telegramListen) await runTelegramListener();
    else await runOnce();
  } catch (e) {
    err(e);
    process.exit(1);
  }
})();
