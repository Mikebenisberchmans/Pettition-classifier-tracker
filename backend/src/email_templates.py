"""
HTML email templates for petition notifications, one per urgency level.
Uses Jinja2 Template (standalone, no Flask app context needed).
"""

from jinja2 import Template

_BASE = """
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:700px;margin:20px auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <!-- Header -->
  <tr>
    <td style="background:{{ header_bg }};padding:24px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;">{{ icon }} {{ heading }}</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">{{ sub_heading }}</p>
    </td>
  </tr>
  <!-- Summary -->
  <tr>
    <td style="padding:24px 32px 8px;">
      <p style="margin:0;font-size:15px;color:#333;">
        <strong>{{ petition_count }}</strong> new petition{{ 's' if petition_count != 1 else '' }}
        filed under <strong>{{ category }}</strong> requiring <strong>{{ urgency }}</strong>.
      </p>
      <p style="margin:10px 0 0;font-size:13px;color:#666;">{{ action_line }}</p>
    </td>
  </tr>
  <!-- Table -->
  <tr>
    <td style="padding:16px 32px 24px;">
      <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
        <tr style="background:{{ header_bg }};color:#fff;">
          <th style="text-align:left;padding:10px 8px;border-radius:4px 0 0 0;">Petition ID</th>
          <th style="text-align:left;padding:10px 8px;">Title</th>
          <th style="text-align:left;padding:10px 8px;">Submitted By</th>
          <th style="text-align:left;padding:10px 8px;">Location</th>
          <th style="text-align:left;padding:10px 8px;border-radius:0 4px 0 0;">Date</th>
        </tr>
        {% for p in petitions %}
        <tr style="background:{{ '#f9f9f9' if loop.index is odd else '#ffffff' }};">
          <td style="padding:8px;border-bottom:1px solid #eee;">{{ p.petition_id }}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">{{ p.petition_title }}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">{{ p.full_name }}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">{{ p.city }}{{ ', ' ~ p.state if p.state else '' }}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;">{{ p.submitted_at }}</td>
        </tr>
        {% endfor %}
      </table>
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td style="padding:16px 32px 24px;border-top:1px solid #eee;">
      <p style="margin:0;font-size:12px;color:#999;">{{ footer }}</p>
      <p style="margin:8px 0 0;font-size:11px;color:#bbb;">This is an automated notification from NyayaSetu Petition System.</p>
    </td>
  </tr>
</table>
</body>
</html>
"""

TEMPLATE = Template(_BASE)

# ── Per-urgency configuration ────────────────────────────────────────────────

URGENCY_CONFIG = {
    "Urgent Action Required": {
        "header_bg": "#C0392B",
        "icon": "\u26a0\ufe0f",
        "heading": "CRITICAL — Immediate Action Required",
        "sub_heading": "These petitions describe life-threatening or emergency situations.",
        "action_line": "Please acknowledge receipt within 24 hours and initiate action immediately.",
        "subject_prefix": "[URGENT]",
        "footer": "This email was sent because these petitions were classified as critically urgent. Timely response is essential.",
    },
    "Fast Action": {
        "header_bg": "#D68910",
        "icon": "\U0001f514",
        "heading": "PRIORITY — Fast Action Needed",
        "sub_heading": "These petitions are time-sensitive and require prompt attention.",
        "action_line": "Please review and respond within 48 hours.",
        "subject_prefix": "[PRIORITY]",
        "footer": "This email was sent because these petitions were classified as priority. Prompt review is requested.",
    },
    "Normal Action": {
        "header_bg": "#2471A3",
        "icon": "\u2139\ufe0f",
        "heading": "New Petitions for Review",
        "sub_heading": "The following petitions have been submitted for your department.",
        "action_line": "Please review and process through standard channels.",
        "subject_prefix": "",
        "footer": "This email was sent as part of the regular petition notification cycle.",
    },
}


def render_email(urgency: str, category: str, petitions: list[dict]) -> tuple[str, str]:
    """Return (subject, html_body) for the given urgency level and petition list."""
    cfg = URGENCY_CONFIG.get(urgency, URGENCY_CONFIG["Normal Action"])

    prefix = cfg["subject_prefix"]
    subject = f"{prefix} {len(petitions)} Petition{'s' if len(petitions) != 1 else ''} — {category}".strip()

    html = TEMPLATE.render(
        header_bg=cfg["header_bg"],
        icon=cfg["icon"],
        heading=cfg["heading"],
        sub_heading=cfg["sub_heading"],
        action_line=cfg["action_line"],
        footer=cfg["footer"],
        petition_count=len(petitions),
        category=category,
        urgency=urgency,
        petitions=petitions,
    )
    return subject, html
