from app.healing.engine import run_with_self_healing


def test_self_healing_retries_then_passes():
    state = {"n": 0}

    def flaky():
        state["n"] += 1
        if state["n"] < 2:
            raise RuntimeError("transient")
        return "ok"

    r = run_with_self_healing(flaky, max_attempts=3)
    assert r.ok is True
    assert r.healed is True
    assert r.attempts == 2
