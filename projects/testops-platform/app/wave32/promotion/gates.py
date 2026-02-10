def evaluate_promotion(env_from: str, env_to: str, counts: dict, policy: dict | None = None):
    policy = policy or {
        "qa": {"max_fail": 5, "allow_error": True},
        "uat": {"max_fail": 2, "allow_error": False},
        "prod": {"max_fail": 0, "allow_error": False},
    }
    target = (env_to or "").lower()
    cfg = policy.get(target, {"max_fail": 0, "allow_error": False})

    fail = int(counts.get("fail", 0))
    err = int(counts.get("error", 0))

    allowed = fail <= cfg["max_fail"] and (cfg["allow_error"] or err == 0)
    return {
        "from": env_from,
        "to": env_to,
        "allowed": allowed,
        "reason": "Gate passed" if allowed else f"Gate failed: fail={fail}, error={err}, policy={cfg}",
        "policy": cfg,
    }
