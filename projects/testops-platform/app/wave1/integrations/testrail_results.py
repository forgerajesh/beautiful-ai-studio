import os
import requests


def push_result(run_id: int, case_id: int, status_id: int, comment: str = ""):
    base = os.getenv("TESTRAIL_BASE_URL", "").rstrip("/")
    user = os.getenv("TESTRAIL_USER_EMAIL", "")
    key = os.getenv("TESTRAIL_API_KEY", "")
    if not all([base, user, key]):
        return {"ok": False, "error": "TestRail credentials not configured"}

    payload = {
        "status_id": status_id,
        "comment": comment,
    }
    r = requests.post(f"{base}/index.php?/api/v2/add_result_for_case/{run_id}/{case_id}", json=payload, auth=(user, key), timeout=30)
    if not r.ok:
        return {"ok": False, "error": r.text}
    return {"ok": True, "result": r.json()}
