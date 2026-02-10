import json
from dataclasses import asdict
from pathlib import Path
from jinja2 import Template


def write_reports(findings, out_dir="reports"):
    p = Path(out_dir)
    p.mkdir(parents=True, exist_ok=True)

    items = [asdict(f) for f in findings]
    (p / "summary.json").write_text(json.dumps(items, indent=2), encoding="utf-8")

    total = len(items)
    fail = len([x for x in items if x["status"] == "FAIL"])
    err = len([x for x in items if x["status"] == "ERROR"])
    passed = len([x for x in items if x["status"] == "PASS"])

    html_tpl = Template("""
    <html><head><title>TestOps Platform Report</title>
    <style>body{font-family:Arial;margin:24px;background:#f8fafc}.card{background:white;border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px}code{background:#eef2ff;padding:2px 6px;border-radius:4px}pre{background:#0b1020;color:#dbeafe;padding:10px;border-radius:8px;overflow:auto}</style>
    </head><body>
    <h1>TestOps Platform - Unified Report</h1>
    <div class='card'><b>Total:</b> {{total}} | <b>Pass:</b> {{passed}} | <b>Fail:</b> {{fail}} | <b>Error:</b> {{err}}</div>
    {% for f in items %}
      <div class='card'>
        <b>{{f.domain}}</b> / <code>{{f.check_id}}</code> / <b>{{f.status}}</b> / severity={{f.severity}}
        <p>{{f.summary}}</p>
        <pre>{{f.details}}</pre>
      </div>
    {% endfor %}
    </body></html>
    """)
    (p / "summary.html").write_text(html_tpl.render(items=items, total=total, passed=passed, fail=fail, err=err), encoding="utf-8")

    return {
        "json": str(p / "summary.json"),
        "html": str(p / "summary.html"),
        "counts": {"total": total, "pass": passed, "fail": fail, "error": err},
    }
