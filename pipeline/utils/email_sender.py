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
from pathlib import Path
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
    """Build an HMAC-signed unsubscribe URL.

    Algorithm must match app/api/unsubscribe/route.ts generateUnsubscribeToken().
    Both use: HMAC-SHA256(secret, email) → hex digest.
    """
    token = hmac.new(secret.encode(), email.encode(), hashlib.sha256).hexdigest()
    return f"{SITE_URL}/api/unsubscribe?email={urllib.parse.quote(email)}&token={token}"


_TEMPLATE_DIR = Path(__file__).parents[1] / "templates"


def _build_notification_html(
    title: str, description: str, article_url: str,
    image_url: Optional[str], unsubscribe_url: str,
) -> str:
    """Build article notification email from shared HTML template.

    Template: pipeline/templates/article_notification.html
    Also used by: lib/email-templates.ts (TypeScript equivalent for Next.js)
    """
    tpl_path = _TEMPLATE_DIR / "article_notification.html"
    html = tpl_path.read_text(encoding="utf-8")

    img_block = ""
    if image_url:
        img_block = (
            f'<tr><td style="padding:0 32px 16px">'
            f'<img src="{image_url}" alt="{title}" width="536" '
            f'style="width:100%;border-radius:4px;display:block" /></td></tr>'
        )

    return (
        html
        .replace("{{SITE_URL}}", SITE_URL)
        .replace("{{ARTICLE_URL}}", article_url)
        .replace("{{TITLE}}", title)
        .replace("{{DESCRIPTION}}", description)
        .replace("{{IMAGE_BLOCK}}", img_block)
        .replace("{{UNSUBSCRIBE_URL}}", unsubscribe_url)
    )
