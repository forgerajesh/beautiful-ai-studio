import os
import requests


def add_comment(issue_key: str, comment: str):
    base = os.getenv("JIRA_BASE_URL", "").rstrip("/")
    user = os.getenv("JIRA_USER_EMAIL", "")
    token = os.getenv("JIRA_API_TOKEN", "")
    if not all([base, user, token, issue_key]):
        return {"ok": False, "error": "jira config missing"}

    payload = {"body": comment}
    r = requests.post(f"{base}/rest/api/3/issue/{issue_key}/comment", json=payload, auth=(user, token), timeout=30)
    if not r.ok:
        return {"ok": False, "error": r.text}
    return {"ok": True, "result": r.json()}


def transition_issue(issue_key: str, transition_id: str):
    base = os.getenv("JIRA_BASE_URL", "").rstrip("/")
    user = os.getenv("JIRA_USER_EMAIL", "")
    token = os.getenv("JIRA_API_TOKEN", "")
    if not all([base, user, token, issue_key, transition_id]):
        return {"ok": False, "error": "jira config missing"}

    payload = {"transition": {"id": transition_id}}
    r = requests.post(f"{base}/rest/api/3/issue/{issue_key}/transitions", json=payload, auth=(user, token), timeout=30)
    if not r.ok:
        return {"ok": False, "error": r.text}
    return {"ok": True}
