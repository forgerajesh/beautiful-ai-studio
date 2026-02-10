import fs from "fs";
import path from "path";

const REPORT_DIR = path.resolve("reports");
const MEMORY_FILE = path.join(REPORT_DIR, "agent-memory.json");

function ensure() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

export function loadMemory() {
  ensure();
  if (!fs.existsSync(MEMORY_FILE)) return { failures: [] };
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
  } catch {
    return { failures: [] };
  }
}

export function recordFailure({ goal, error, workflowFile, iteration }) {
  const mem = loadMemory();
  mem.failures.push({
    ts: new Date().toISOString(),
    goal,
    error,
    workflowFile,
    iteration
  });
  mem.failures = mem.failures.slice(-50);
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(mem, null, 2));
}

export function recentFailureContext(limit = 5) {
  const mem = loadMemory();
  return (mem.failures || []).slice(-limit);
}

function tokenize(s) {
  return new Set(
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((x) => x.length > 2)
  );
}

function jaccard(a, b) {
  const inter = new Set([...a].filter((x) => b.has(x))).size;
  const union = new Set([...a, ...b]).size || 1;
  return inter / union;
}

export function relevantFailureContext(goal, limit = 5) {
  const mem = loadMemory();
  const goalTokens = tokenize(goal);
  const scored = (mem.failures || []).map((f) => {
    const txt = `${f.goal || ""} ${f.error || ""}`;
    const score = jaccard(goalTokens, tokenize(txt));
    return { ...f, score };
  });

  return scored
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
