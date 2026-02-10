from pathlib import Path
from jinja2 import Template

HTML = """
<html><head><title>Security Testing Report</title>
<style>
body { font-family: Arial; margin: 24px; background: #f8fafc; }
.card { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; margin-bottom: 10px; }
.pass { color: #166534; } .fail { color: #991b1b; } .error { color: #9a3412; }
code { background:#eef2ff; padding:2px 5px; border-radius:4px; }
pre { background:#0b1020; color:#dbeafe; padding:10px; border-radius:8px; overflow:auto; }
</style></head><body>
<h1>Security Testing Report</h1>
<p>Total: {{ total }} | Fail: {{ fail }} | Error: {{ error }}</p>
{% for f in findings %}
<div class="card">
  <b>{{ f.check_id }}</b> on <code>{{ f.target_id }}</code> |
  <span class="{{ f.status|lower }}">{{ f.status }}</span> |
  Severity: {{ f.severity }}
  <p>{{ f.summary }}</p>
  {% if f.details %}<pre>{{ f.details }}</pre>{% endif %}
</div>
{% endfor %}
</body></html>
"""


def write_html(findings, out_dir: str):
    p = Path(out_dir)
    p.mkdir(parents=True, exist_ok=True)
    out = p / "security_report.html"
    tpl = Template(HTML)
    html = tpl.render(
        findings=findings,
        total=len(findings),
        fail=sum(1 for f in findings if f.status == "FAIL"),
        error=sum(1 for f in findings if f.status == "ERROR"),
    )
    out.write_text(html, encoding="utf-8")
    return str(out)
