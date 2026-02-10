import fs from "fs";
import path from "path";

const REPORT_DIR = path.resolve("reports");
const EMB_FILE = path.join(REPORT_DIR, "agent-memory-embeddings.json");

function ensure() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function dot(a, b) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

function norm(a) {
  return Math.sqrt(dot(a, a)) || 1;
}

function cosine(a, b) {
  return dot(a, b) / (norm(a) * norm(b));
}

export function loadEmbMemory() {
  ensure();
  if (!fs.existsSync(EMB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(EMB_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function saveEmbMemory(items) {
  ensure();
  fs.writeFileSync(EMB_FILE, JSON.stringify(items.slice(-200), null, 2));
}

export async function embedText(text) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({ model, input: text })
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.[0]?.embedding || null;
}

export async function rememberFailureSemantic(item) {
  const vec = await embedText(`${item.goal}\n${item.error}`);
  if (!vec) return false;
  const mem = loadEmbMemory();
  mem.push({ ...item, embedding: vec });
  saveEmbMemory(mem);
  return true;
}

export async function retrieveRelevantSemantic(goal, limit = 5) {
  const q = await embedText(goal);
  if (!q) return [];
  const mem = loadEmbMemory();
  const scored = mem
    .map((m) => ({ ...m, score: cosine(q, m.embedding || []) }))
    .filter((m) => Number.isFinite(m.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored;
}
