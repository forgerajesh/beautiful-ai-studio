import os
import json
import requests


def synthesize_tests_from_diff(pr_diff: str):
    key = os.getenv("OPENAI_API_KEY", "")
    base = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    fallback = {
        "functional": ["Validate modified UI journeys from diff"],
        "api": ["Run contract and status code checks for touched API handlers"],
        "non_functional": ["Execute SLA checks for changed endpoints"],
        "security": ["Run secrets + SAST checks for changed files"],
        "accessibility": ["Run a11y smoke on changed pages"],
    }

    if not key:
        return {"ok": True, "source": "fallback", "plan": fallback}

    prompt = {
        "instruction": "Create concise test plan grouped by functional/api/non_functional/security/accessibility from PR diff.",
        "pr_diff": pr_diff[:12000],
        "format": "Return strict JSON object with those keys and string-array values.",
    }

    try:
        r = requests.post(
            f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"model": model, "temperature": 0, "messages": [{"role": "user", "content": json.dumps(prompt)}]},
            timeout=40,
        )
        if not r.ok:
            return {"ok": True, "source": "fallback", "plan": fallback}
        txt = r.json()["choices"][0]["message"]["content"].strip()
        plan = json.loads(txt)
        return {"ok": True, "source": "ai", "plan": plan}
    except Exception:
        return {"ok": True, "source": "fallback", "plan": fallback}
