import { chromium } from "playwright";
import fs from "fs";
import path from "path";

export async function runWorkflow(workflow, { headless = true } = {}) {
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();
  const started = Date.now();

  try {
    await page.goto(workflow.url, { waitUntil: "domcontentloaded" });

    for (const step of workflow.steps || []) {
      switch (step.action) {
        case "click":
          await page.locator(step.selector).click();
          break;
        case "type":
          await page.locator(step.selector).fill(step.text ?? "");
          break;
        case "expectUrlContains": {
          const url = page.url();
          if (!url.includes(step.value)) throw new Error(`URL assertion failed. Expected contains '${step.value}', got '${url}'`);
          break;
        }
        case "waitFor":
          await page.locator(step.selector).waitFor({ state: step.state || "visible", timeout: step.timeout || 10000 });
          break;
        case "screenshot": {
          const out = path.resolve(step.path || "reports/screenshot.png");
          fs.mkdirSync(path.dirname(out), { recursive: true });
          await page.screenshot({ path: out, fullPage: true });
          break;
        }
        default:
          throw new Error(`Unsupported action: ${step.action}`);
      }
    }

    return {
      ok: true,
      name: workflow.name || "workflow",
      durationMs: Date.now() - started,
      finalUrl: page.url()
    };
  } catch (e) {
    return {
      ok: false,
      name: workflow.name || "workflow",
      durationMs: Date.now() - started,
      error: String(e)
    };
  } finally {
    await context.close();
    await browser.close();
  }
}
