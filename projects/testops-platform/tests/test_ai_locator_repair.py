from app.healing.ai_locator_repair import suggest_selector


def test_ai_locator_repair_fallback_without_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    s = suggest_selector("#user-name", {"action": "type", "text": "standard_user"}, "")
    assert "user-name" in s or "Username" in s
