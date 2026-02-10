import fs from "fs";
import path from "path";
import { generateWorkflow, saveWorkflow } from "./planner.js";
import { executeWorkflowFile } from "./engine.js";
import { appendHistory, buildDashboard } from "./history.js";
import { recentFailureContext, recordFailure } from "./memory.js";

function persistRun(result) {
  appendHistory({
    ts: new Date().toISOString(),
    name: result.name,
    ok: !!result.ok,
    durationMs: result.durationMs,
    finalUrl: result.finalUrl,
    error: result.error || ""
  });
  return buildDashboard();
}

export async function runClaudeLikeAgent({
  goal,
  outputDir = "./examples",
  maxIterations = Number(process.env.AGENT_MAX_ITERATIONS || 2),
  notify = false
}) {
  if (!goal || !goal.trim()) throw new Error("Goal is required for Claude-like mode");

  const trace = [];
  let lastResult = null;
  const recentFailures = recentFailureContext(5);

  for (let i = 1; i <= maxIterations; i++) {
    const memoryBlock = recentFailures.length
      ? `\nRecent failures context:\n${recentFailures.map((f, idx) => `${idx + 1}) goal=${f.goal} | error=${f.error}`).join("\n")}`
      : "";

    const prompt =
      i === 1
        ? `${goal}${memoryBlock}`
        : `${goal}\nPrevious attempt failed with error: ${lastResult?.error || "unknown"}\nGenerate a safer, simpler recovery workflow.${memoryBlock}`;

    const wf = await generateWorkflow(prompt);
    const file = path.resolve(outputDir, `agentic-${Date.now()}-${i}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    saveWorkflow(wf, file);

    const result = await executeWorkflowFile(file, { notify });
    const dashboard = persistRun(result);

    trace.push({ iteration: i, workflowFile: file, result });
    lastResult = result;

    if (!result.ok) {
      recordFailure({ goal, error: result.error || "unknown", workflowFile: file, iteration: i });
    }

    if (result.ok) {
      return {
        ok: true,
        goal,
        iterationsUsed: i,
        final: result,
        dashboard,
        trace
      };
    }
  }

  return {
    ok: false,
    goal,
    iterationsUsed: maxIterations,
    final: lastResult,
    dashboard: buildDashboard(),
    trace
  };
}
