"""
Daily email job — queries un-emailed petitions, groups by (category, urgency),
sends urgency-appropriate emails to the relevant department, marks them as sent.
"""

import json, os, sqlite3, smtplib, logging, time
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from collections import defaultdict

from email_templates import render_email

logger = logging.getLogger(__name__)

BASE_DIR    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_DIR  = os.path.join(BASE_DIR, "config")
DB_PATH     = os.path.join(BASE_DIR, "data", "petitions.db")


def load_email_config() -> dict:
    path = os.path.join(CONFIG_DIR, "email_config.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_department_mapping() -> dict:
    path = os.path.join(CONFIG_DIR, "department_emails.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _send_email(config: dict, recipients: list[str], subject: str, html_body: str) -> bool:
    """Send a single HTML email via SMTP. Returns True on success."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{config['sender_name']} <{config['sender_email']}>"
    msg["To"]      = ", ".join(recipients)
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(config["smtp_host"], config["smtp_port"], timeout=30) as server:
            if config.get("use_tls"):
                server.starttls()
            if config.get("smtp_user"):
                server.login(config["smtp_user"], config["smtp_password"])
            server.sendmail(config["sender_email"], recipients, msg.as_string())
        return True
    except Exception:
        logger.exception("Failed to send email to %s", recipients)
        return False


def run_daily_email_job() -> dict:
    """
    Main scheduled job entry point.
    Returns a summary dict (useful for the manual-trigger endpoint).
    """
    logger.info("=== Daily petition email job started ===")

    try:
        config  = load_email_config()
        dept_map = load_department_mapping()
    except Exception:
        logger.exception("Failed to load config files")
        return {"error": "Config load failed"}

    fallback_emails = dept_map.get("Other", ["general.petitions@gov.example.com"])

    # Open a dedicated connection (this runs outside Flask request context)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute("SELECT * FROM petitions WHERE emailed_at IS NULL").fetchall()

        if not rows:
            logger.info("No new petitions to email.")
            return {"sent": 0, "pending": 0, "message": "No new petitions"}

        # Group by (category, urgency)
        groups = defaultdict(list)
        for row in rows:
            key = (row["category"], row["predicted_label"] or "Normal Action")
            groups[key].append(dict(row))

        sent_count   = 0
        failed_count = 0

        for (category, urgency), petitions in groups.items():
            recipients = dept_map.get(category, fallback_emails)
            subject, html = render_email(urgency, category, petitions)

            logger.info("Sending %d petition(s) [%s / %s] → %s",
                        len(petitions), category, urgency, recipients)

            if _send_email(config, recipients, subject, html):
                ids = [p["petition_id"] for p in petitions]
                placeholders = ",".join("?" for _ in ids)
                now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                conn.execute(
                    f"UPDATE petitions SET emailed_at = ? WHERE petition_id IN ({placeholders})",
                    [now] + ids,
                )
                conn.commit()
                sent_count += len(petitions)
                logger.info("  ✓ Marked %d petition(s) as emailed", len(petitions))
            else:
                failed_count += len(petitions)
                logger.warning("  ✗ Failed — will retry next run")

            time.sleep(1)  # small delay to avoid SMTP rate limits

        summary = {
            "sent": sent_count,
            "failed": failed_count,
            "groups": len(groups),
        }
        logger.info("=== Email job finished: %s ===", summary)
        return summary

    finally:
        conn.close()
