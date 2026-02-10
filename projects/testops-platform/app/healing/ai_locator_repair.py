import json
import os
from typing import Optional

import requests


def _fallback(selector: str) -> str:
    """Deterministic local fallback if AI is unavailable."""
    mapping = {
        "#user-name": "input[name='user-name'], #user-name, input[placeholder*='Username']",
        "#password": "input[name='password'], #password, input[type='password']",
        "#login-button": "input[type='submit'], #login-button, button:has-text('Login')",
    }
    return mapping.get(selector, selector)


def suggest_selector(selector: str, step: dict, dom_excerpt: str = "") -> str:
    key = os.getenv("OPENAI_API_KEY", "")
    base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if not key:
        return _fallback(selector)

    prompt = {
        "selector": selector,
        "action": step.get("action"),
        "text": step.get("text", ""),
        "dom_excerpt": dom_excerpt[:4000],
        "instruction": "Return ONLY a resilient Playwright CSS selector string for this step.",
    }

    try:
        r = requests.post(
            f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "temperature": 0,
                "messages": [
                    {"role": "system", "content": "You are a UI test locator repair assistant. Return only selector text."},
                    {"role": "user", "content": json.dumps(prompt)},
                ],
            },
            timeout=30,
        )
        if not r.ok:
            return _fallback(selector)
        content = r.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
        return content or _fallback(selector)
    except Exception:
        return _fallback(selector)
