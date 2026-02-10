import json
import requests
from agentic.config import CONFIG


def _fallback(prompt: str):
    p = (prompt or "").lower()
    if "saucedemo" in p or "login" in p:
        return {
            "name": "Generated: SauceDemo login",
            "url": "https://www.saucedemo.com/",
            "steps": [
                {"action": "type", "selector": "#user-name", "text": "standard_user"},
                {"action": "type", "selector": "#password", "text": "secret_sauce"},
                {"action": "click", "selector": "#login-button"},
                {"action": "expectUrlContains", "value": "inventory.html"},
                {"action": "screenshot", "path": "reports/generated-saucedemo.png"},
            ],
        }
    return {"name": "Generated: Generic smoke", "url": "https://example.com", "steps": [{"action": "waitFor", "selector": "body"}]}


def generate_workflow(prompt: str):
    key = CONFIG["openai"]["key"]
    if not key:
        return _fallback(prompt)

    base = CONFIG["openai"]["base_url"].rstrip("/")
    model = CONFIG["openai"]["model"]
    body = {
        "model": model,
        "temperature": 0.1,
        "messages": [
            {"role": "system", "content": "Return only valid workflow JSON. No markdown."},
            {"role": "user", "content": f"Create Playwright workflow JSON for: {prompt}"},
        ],
    }
    try:
        r = requests.post(
            f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json=body,
            timeout=40,
        )
        if not r.ok:
            return _fallback(prompt)
        content = r.json()["choices"][0]["message"]["content"].strip()
        return json.loads(content)
    except Exception:
        return _fallback(prompt)
