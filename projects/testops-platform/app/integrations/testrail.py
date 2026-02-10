import os
import requests


def create_test_run(name: str, case_ids: list[int] | None = None):
    base = os.getenv("TESTRAIL_BASE_URL", "").rstrip("/")
    user = os.getenv("TESTRAIL_USER_EMAIL", "")
    key = os.getenv("TESTRAIL_API_KEY", "")
    project_id = os.getenv("TESTRAIL_PROJECT_ID", "")
    suite_id = os.getenv("TESTRAIL_SUITE_ID", "")

    if not all([base, user, key, project_id]):
        return {"ok": False, "error": "TestRail credentials/project not configured"}

    payload = {
        "name": name,
        "include_all": False if case_ids else True,
    }
    if suite_id:
        payload["suite_id"] = int(suite_id)
    if case_ids:
        payload["case_ids"] = case_ids

    r = requests.post(f"{base}/index.php?/api/v2/add_run/{project_id}", json=payload, auth=(user, key), timeout=30)
    if not r.ok:
        return {"ok": False, "error": r.text}
    return {"ok": True, "run": r.json()}
