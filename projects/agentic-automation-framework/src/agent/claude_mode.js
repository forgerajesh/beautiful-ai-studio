import fs from "fs";
import path from "path";
import { generateWorkflow, saveWorkflow } from "./planner.js";
import { executeWorkflowFile } from "./engine.js";
import { appendHistory, buildDashboard } from "./history.js";

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

  for (let i = 1; i <= maxIterations; i++) {
    const prompt =
      i === 1
        ? goal
        : `${goal}\nPrevious attempt failed with error: ${lastResult?.error || "unknown"}\nGenerate a safer, simpler recovery workflow.`;

    const wf = await generateWorkflow(prompt);
    const file = path.resolve(outputDir, `agentic-${Date.now()}-${i}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    saveWorkflow(wf, file);

    const result = await executeWorkflowFile(file, { notify });
    const dashboard = persistRun(result);

    trace.push({ iteration: i, workflowFile: file, result });
    lastResult = result;

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
