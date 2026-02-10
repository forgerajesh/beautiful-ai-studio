import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright


def run_workflow(workflow: dict, headless=True):
    started = time.time()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=headless)
            context = browser.new_context()
            page = context.new_page()
            page.goto(workflow["url"], wait_until="domcontentloaded")

            for step in workflow.get("steps", []):
                action = step["action"]
                if action == "click":
                    page.locator(step["selector"]).click()
                elif action == "type":
                    page.locator(step["selector"]).fill(step.get("text", ""))
                elif action == "waitFor":
                    page.locator(step["selector"]).wait_for(state=step.get("state", "visible"), timeout=step.get("timeout", 10000))
                elif action == "expectUrlContains":
                    cur = page.url
                    if step["value"] not in cur:
                        raise AssertionError(f"URL assertion failed: expected '{step['value']}' in '{cur}'")
                elif action == "screenshot":
                    out = Path(step.get("path", "reports/screenshot.png"))
                    out.parent.mkdir(parents=True, exist_ok=True)
                    page.screenshot(path=str(out), full_page=True)
                else:
                    raise ValueError(f"Unsupported action: {action}")

            final_url = page.url
            context.close()
            browser.close()
            return {
                "ok": True,
                "name": workflow.get("name", "workflow"),
                "durationMs": int((time.time() - started) * 1000),
                "finalUrl": final_url,
            }
    except Exception as e:
        return {
            "ok": False,
            "name": workflow.get("name", "workflow"),
            "durationMs": int((time.time() - started) * 1000),
            "error": str(e),
        }
