import json
from pathlib import Path

REPORTS = Path("reports")
HISTORY = REPORTS / "run-history.json"
DASHBOARD = REPORTS / "dashboard.html"


def load_history():
    REPORTS.mkdir(exist_ok=True)
    if not HISTORY.exists():
        return []
    try:
        return json.loads(HISTORY.read_text())
    except Exception:
        return []


def append_history(item: dict):
    hist = load_history()
    hist.append(item)
    hist = hist[-200:]
    HISTORY.write_text(json.dumps(hist, indent=2))
    return hist


def build_dashboard():
    hist = load_history()
    total = len(hist)
    passed = len([x for x in hist if x.get("ok")])
    failed = total - passed

    rows = "\n".join(
        [
            f"<tr><td>{x.get('ts')}</td><td>{x.get('name')}</td><td>{'✅ PASS' if x.get('ok') else '❌ FAIL'}</td><td>{x.get('durationMs')}</td><td><code>{x.get('finalUrl','')}</code></td><td><code>{(x.get('error') or '').replace('<','&lt;')}</code></td></tr>"
            for x in reversed(hist)
        ]
    )

    html = f"""
    <html><head><title>Agentic Dashboard</title>
    <style>body{{font-family:Arial;margin:24px;background:#f8fafc}}table{{width:100%;border-collapse:collapse;background:#fff}}th,td{{border:1px solid #e2e8f0;padding:8px;font-size:13px}}th{{background:#eef2ff}}</style>
    </head><body>
    <h1>Agentic Automation Dashboard</h1>
    <p><b>Total:</b> {total} | <b>Pass:</b> {passed} | <b>Fail:</b> {failed}</p>
    <table><thead><tr><th>Time</th><th>Workflow</th><th>Status</th><th>Duration(ms)</th><th>Final URL</th><th>Error</th></tr></thead><tbody>{rows}</tbody></table>
    </body></html>
    """
    DASHBOARD.write_text(html)
    return str(DASHBOARD)
