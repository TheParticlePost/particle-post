"""
Email notification sender for the Particle Post pipeline.

Sends article notification emails to all active subscribers via the Resend API.
Called from run.py after a successful article publish.
"""

import hashlib
import hmac
import json
import os
import urllib.parse
import urllib.request
from typing import Optional


SITE_URL = "https://theparticlepost.com"
RESEND_API_URL = "https://api.resend.com/emails/batch"
BATCH_SIZE = 50  # Resend batch limit


def send_article_notification(
    title: str,
    slug: str,
    description: str,
    image_url: Optional[str] = None,
) -> str:
    """
    Send article notification emails to all active subscribers.

    Returns a summary string (e.g., "Sent to 42 subscribers, 0 failures").
    Non-fatal: catches all errors and returns an error message instead of raising.
    """
    resend_key = os.environ.get("RESEND_API_KEY")
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    unsubscribe_secret = os.environ.get("UNSUBSCRIBE_SECRET") or resend_key or "fallback"

    if not resend_key:
        return "Skipped: RESEND_API_KEY not set"
    if not supabase_url or not supabase_key:
        return "Skipped: Supabase credentials not set"

    # 1. Fetch active subscribers
    subscribers = _fetch_subscribers(supabase_url, supabase_key)
    if not subscribers:
        return "No active subscribers found"

    # 2. Send in batches
    total_sent = 0
    total_failed = 0
    article_url = f"{SITE_URL}/posts/{slug}/"

    for i in range(0, len(subscribers), BATCH_SIZE):
        batch = subscribers[i : i + BATCH_SIZE]
        emails_payload = []

        for sub in batch:
            email = sub.get("email", "")
            if not email:
                continue

            unsub_url = _build_unsubscribe_url(email, unsubscribe_secret)
            html = _build_notification_html(title, description, article_url, image_url, unsub_url)

            emails_payload.append({
                "from": "Particle Post <briefing@theparticlepost.com>",
                "to": [email],
                "subject": title,
                "html": html,
                "headers": {
                    "List-Unsubscribe": f"<{unsub_url}>",
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
                },
            })

        if not emails_payload:
            continue

        try:
            req = urllib.request.Request(
                RESEND_API_URL,
                data=json.dumps(emails_payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp.read()
            total_sent += len(emails_payload)
        except Exception as e:
            total_failed += len(emails_payload)
            print(f"  [Email] Batch send error: {e}")

    return f"Sent to {total_sent} subscribers, {total_failed} failures"


def _fetch_subscribers(supabase_url: str, supabase_key: str) -> list[dict]:
    """Fetch all active subscribers from Supabase."""
    url = f"{supabase_url}/rest/v1/subscribers?select=email&status=eq.active"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except Exception as e:
        print(f"  [Email] Failed to fetch subscribers: {e}")
        return []


def _build_unsubscribe_url(email: str, secret: str) -> str:
    """Build an HMAC-signed unsubscribe URL."""
    token = hmac.new(secret.encode(), email.encode(), hashlib.sha256).hexdigest()
    return f"{SITE_URL}/api/unsubscribe?email={urllib.parse.quote(email)}&token={token}"


def _build_notification_html(
    title: str, description: str, article_url: str,
    image_url: Optional[str], unsubscribe_url: str,
) -> str:
    """Build the article notification email HTML."""
    img_block = ""
    if image_url:
        img_block = (
            f'<tr><td style="padding:0 32px 16px">'
            f'<img src="{image_url}" alt="{title}" width="536" '
            f'style="width:100%;border-radius:4px;display:block" /></td></tr>'
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#141414;font-family:'DM Sans',Helvetica,Arial,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#141414">
  <tr><td align="center" style="padding:32px 16px">
    <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#1E1E1E;border-radius:6px">
      <tr><td style="padding:24px 32px;border-bottom:2px solid #E8552E">
        <a href="{SITE_URL}" style="text-decoration:none;color:#F5F0EB;font-size:18px;font-weight:700">PARTICLE POST</a>
      </td></tr>
      <tr><td style="padding:24px 32px 8px">
        <p style="color:#E8552E;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0;font-family:'IBM Plex Mono',monospace">NEW BRIEFING</p>
      </td></tr>
      {img_block}
      <tr><td style="padding:0 32px 16px">
        <a href="{article_url}" style="text-decoration:none">
          <h1 style="color:#F5F0EB;font-size:22px;font-weight:700;line-height:1.3;margin:0">{title}</h1>
        </a>
      </td></tr>
      <tr><td style="padding:0 32px 24px">
        <p style="color:#9A8C82;font-size:15px;line-height:1.6;margin:0">{description}</p>
      </td></tr>
      <tr><td style="padding:0 32px 32px">
        <a href="{article_url}" style="display:inline-block;padding:12px 24px;background-color:#E8552E;color:#141414;font-size:14px;font-weight:600;text-decoration:none;border-radius:4px">Read the full briefing &rarr;</a>
      </td></tr>
      <tr><td style="padding:24px 32px;text-align:center;border-top:1px solid rgba(90,65,59,0.2)">
        <a href="{unsubscribe_url}" style="color:#9A8C82;font-size:11px;font-family:'IBM Plex Mono',monospace;text-decoration:none">Unsubscribe</a>
        <span style="color:#6B5E56;font-size:11px"> &middot; </span>
        <a href="{SITE_URL}" style="color:#9A8C82;font-size:11px;font-family:'IBM Plex Mono',monospace;text-decoration:none">theparticlepost.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""
