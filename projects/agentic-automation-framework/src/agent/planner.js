import fs from "fs";

function fallbackWorkflowFromPrompt(prompt) {
  const p = (prompt || "").toLowerCase();
  if (p.includes("saucedemo")) {
    return {
      name: "Generated: SauceDemo login",
      url: "https://www.saucedemo.com/",
      steps: [
        { action: "type", selector: "#user-name", text: "standard_user" },
        { action: "type", selector: "#password", text: "secret_sauce" },
        { action: "click", selector: "#login-button" },
        { action: "expectUrlContains", value: "inventory.html" },
        { action: "screenshot", path: "reports/generated-saucedemo.png" }
      ]
    };
  }

  return {
    name: "Generated: Generic smoke",
    url: "https://example.com",
    steps: [
      { action: "waitFor", selector: "body" },
      { action: "screenshot", path: "reports/generated-smoke.png" }
    ]
  };
}

async function openaiPlan(prompt) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

  const schemaHint = {
    name: "string",
    url: "https://target",
    steps: [
      { action: "type|click|waitFor|expectUrlContains|screenshot", selector: "css", text: "optional", value: "optional", path: "optional" }
    ]
  };

  const body = {
    model,
    temperature: 0.1,
    messages: [
      { role: "system", content: "You generate Playwright workflow JSON only. No markdown." },
      { role: "user", content: `Create workflow JSON from this request: ${prompt}\nSchema:${JSON.stringify(schemaHint)}` }
    ]
  };

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    return null;
  }
}

export async function generateWorkflow(prompt) {
  const ai = await openaiPlan(prompt);
  return ai || fallbackWorkflowFromPrompt(prompt);
}

export function saveWorkflow(workflow, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2));
  return filePath;
}
