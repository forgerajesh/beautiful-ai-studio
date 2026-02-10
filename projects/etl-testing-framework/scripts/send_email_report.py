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
    smtp_pass = env("SMTP_PASS")  # Gmail App Password recommended
    to_email = env("REPORT_TO")
    from_email = env("REPORT_FROM", default=smtp_user)

    junit = ROOT / "reports" / "junit.xml"
    ai_notes = ROOT / "reports" / "ai_remediation.md"

    msg = EmailMessage()
    msg["Subject"] = "ETL Test Automation Report"
    msg["From"] = from_email
    msg["To"] = to_email

    body = [
        "Hi,",
        "",
        "Please find the latest ETL testing report attached.",
        f"- JUnit: {'FOUND' if junit.exists() else 'NOT FOUND'}",
        f"- AI Remediation Notes: {'FOUND' if ai_notes.exists() else 'NOT FOUND'}",
        "",
        "Regards,",
        "ETL Testing Framework",
    ]
    msg.set_content("\n".join(body))

    if junit.exists():
        msg.add_attachment(
            junit.read_bytes(),
            maintype="application",
            subtype="xml",
            filename="junit.xml",
        )

    if ai_notes.exists():
        msg.add_attachment(
            ai_notes.read_bytes(),
            maintype="text",
            subtype="markdown",
            filename="ai_remediation.md",
        )

    with smtplib.SMTP(smtp_host, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)

    print(f"Email report sent to {to_email}")


if __name__ == "__main__":
    main()
