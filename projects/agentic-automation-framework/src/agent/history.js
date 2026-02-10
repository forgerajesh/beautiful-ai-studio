import fs from "fs";
import path from "path";

const REPORT_DIR = path.resolve("reports");
const HISTORY_FILE = path.join(REPORT_DIR, "run-history.json");
const DASHBOARD_FILE = path.join(REPORT_DIR, "dashboard.html");

function ensureDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

export function loadHistory() {
  ensureDir();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export function appendHistory(entry) {
  const hist = loadHistory();
  hist.push(entry);
  const last = hist.slice(-200);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(last, null, 2));
  return last;
}

export function buildDashboard() {
  const hist = loadHistory();
  const total = hist.length;
  const pass = hist.filter((x) => x.ok).length;
  const fail = total - pass;

  const rows = hist
    .slice()
    .reverse()
    .map(
      (r) => `<tr><td>${r.ts}</td><td>${r.name}</td><td>${r.ok ? "✅ PASS" : "❌ FAIL"}</td><td>${r.durationMs}</td><td><code>${r.finalUrl || ""}</code></td><td><code>${(r.error || "").replace(/</g, "&lt;")}</code></td></tr>`
    )
    .join("\n");

  const html = `
  <html><head><title>Agentic Automation Dashboard</title>
  <style>
  body{font-family:Arial;margin:24px;background:#f8fafc}
  .card{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:12px}
  table{width:100%;border-collapse:collapse;background:white}
  th,td{border:1px solid #e2e8f0;padding:8px;font-size:13px;text-align:left}
  th{background:#eef2ff}
  </style>
  </head><body>
  <h1>Agentic Automation Run Dashboard</h1>
  <div class='card'><b>Total:</b> ${total} | <b>Pass:</b> ${pass} | <b>Fail:</b> ${fail}</div>
  <table>
    <thead><tr><th>Time</th><th>Workflow</th><th>Status</th><th>Duration(ms)</th><th>Final URL</th><th>Error</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  </body></html>`;

  fs.writeFileSync(DASHBOARD_FILE, html);
  return DASHBOARD_FILE;
}
