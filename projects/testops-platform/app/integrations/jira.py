import os
import requests


def create_jira_issue(summary: str, description: str, issue_type: str = "Task"):
    base = os.getenv("JIRA_BASE_URL", "").rstrip("/")
    user = os.getenv("JIRA_USER_EMAIL", "")
    token = os.getenv("JIRA_API_TOKEN", "")
    project = os.getenv("JIRA_PROJECT_KEY", "")

    if not all([base, user, token, project]):
        return {"ok": False, "error": "Jira credentials/project not configured"}

    payload = {
        "fields": {
            "project": {"key": project},
            "summary": summary,
            "description": description,
            "issuetype": {"name": issue_type},
        }
    }
    r = requests.post(f"{base}/rest/api/3/issue", json=payload, auth=(user, token), timeout=30)
    if not r.ok:
        return {"ok": False, "error": r.text}
    return {"ok": True, "issue": r.json()}
