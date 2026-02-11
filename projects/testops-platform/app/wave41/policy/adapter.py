import os
import requests

from app.wave2.policy.engine import evaluate_policy


def evaluate_with_adapter(input_data: dict):
    opa_url = str(os.getenv("OPA_POLICY_URL", "")).strip()
    timeout_s = int(os.getenv("OPA_TIMEOUT_SECONDS", "5"))

    if not opa_url:
        local = evaluate_policy(input_data)
        local["adapter"] = "local"
        return local

    try:
        response = requests.post(opa_url, json={"input": input_data}, timeout=timeout_s)
        response.raise_for_status()
        payload = response.json()
        result = payload.get("result")

        if isinstance(result, dict):
            if "decision" in result:
                decision = str(result.get("decision", "DENY")).upper()
            else:
                decision = "ALLOW" if bool(result.get("allow", False)) else "DENY"
            violations = result.get("violations") or ([] if decision == "ALLOW" else ["opa_denied"])
        else:
            decision = "ALLOW" if bool(result) else "DENY"
            violations = [] if decision == "ALLOW" else ["opa_denied"]

        return {
            "decision": decision,
            "violations": violations,
            "input": input_data,
            "adapter": "opa",
            "opa_url": opa_url,
            "raw": payload,
        }
    except Exception as exc:
        local = evaluate_policy(input_data)
        local["adapter"] = "local_fallback"
        local["opa_error"] = str(exc)
        return local
