#!/usr/bin/env python3
import os
import smtplib
from email.message import EmailMessage
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def env(name: str, required: bool = True, default: str = "") -> str:
    v = os.getenv(name, default)
    if required and not v:
        raise ValueError(f"Missing required env: {name}")
    return v


def main():
    smtp_host = env("SMTP_HOST", default="smtp.gmail.com")
    smtp_port = int(env("SMTP_PORT", default="587"))
    smtp_user = env("SMTP_USER")
    smtp_pass = env("SMTP_PASS")
    to_email = env("REPORT_TO")
    from_email = env("REPORT_FROM", default=smtp_user)

    attachments = [
        ROOT / "reports" / "security_bundle_summary.json",
        ROOT / "reports" / "security_bundle_summary.html",
        ROOT / "reports" / "security_report.html",
        ROOT / "reports" / "security_junit.xml",
        ROOT / "sarif" / "security_report.sarif",
    ]

    msg = EmailMessage()
    msg["Subject"] = "SECQ Security Suite Report"
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content("SECQ run completed. Attached are security reports and SARIF summary.")

    for f in attachments:
        if not f.exists():
            continue
        data = f.read_bytes()
        if f.suffix == ".json":
            mt, st = "application", "json"
        elif f.suffix == ".html":
            mt, st = "text", "html"
        elif f.suffix == ".xml":
            mt, st = "application", "xml"
        elif f.suffix == ".sarif":
            mt, st = "application", "json"
        else:
            mt, st = "application", "octet-stream"
        msg.add_attachment(data, maintype=mt, subtype=st, filename=f.name)

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)

    print(f"Security report email sent to {to_email}")


if __name__ == "__main__":
    main()
