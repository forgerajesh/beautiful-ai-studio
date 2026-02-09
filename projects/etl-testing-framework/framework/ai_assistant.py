import json
import os
import urllib.request


class AIAssistant:
    """OpenAI-compatible helper for failure triage and rule suggestion."""

    def __init__(self, enabled: bool, model: str = "gpt-4o-mini", base_url: str = "https://api.openai.com/v1"):
        self.enabled = enabled
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.api_key = os.getenv("OPENAI_API_KEY", "")

    def _chat(self, prompt: str) -> str:
        if not self.enabled:
            return "AI disabled"
        if not self.api_key:
            return "AI unavailable: OPENAI_API_KEY not set"

        url = f"{self.base_url}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a senior ETL test architect. Give concise, actionable remediation."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.1,
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                body = json.loads(resp.read().decode("utf-8"))
                return body["choices"][0]["message"]["content"].strip()
        except Exception as e:
            return f"AI call failed: {e}"

    def triage_failure(self, test_id: str, message: str, details: dict | None = None) -> str:
        prompt = (
            f"Test failed: {test_id}\n"
            f"Failure: {message}\n"
            f"Details: {json.dumps(details or {}, default=str)}\n"
            "Provide: likely root causes, immediate debugging SQL checks, and a fix plan in 5 bullets."
        )
        return self._chat(prompt)

    def suggest_additional_tests(self, table_name: str, schema_columns: list[dict]) -> str:
        prompt = (
            f"Suggest high-value ETL data quality tests for table {table_name}.\n"
            f"Schema: {json.dumps(schema_columns, default=str)}\n"
            "Return concise bullets grouped by critical/high/medium."
        )
        return self._chat(prompt)
