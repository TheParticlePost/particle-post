"""
Google Indexing API tool — requests immediate crawling of new articles.

Uses the Google Indexing API v3 (separate from Search Console API).
Auth: Application Default Credentials (WIF in GitHub Actions, GOOGLE_CREDENTIALS locally).

Requirements:
  - Google Indexing API must be enabled in Google Cloud Console
  - Service account must be added as an Owner in Google Search Console
    (Settings → Users and permissions → Owner level)
"""

import json
import os

from crewai.tools import BaseTool

_SITE_URL  = "https://theparticlepost.com"
_SCOPE     = "https://www.googleapis.com/auth/indexing"
_ENDPOINT  = "https://indexing.googleapis.com/v3/urlNotifications:publish"


class GoogleIndexingTool(BaseTool):
    name: str = "google_indexing"
    description: str = (
        "Submit a URL to Google for immediate crawling via the Google Indexing API. "
        "Input: full article URL (e.g. 'https://theparticlepost.com/posts/slug/')."
    )

    def _run(self, url: str) -> str:
        url = url.strip()
        if not url:
            return "[Google Indexing] No URL provided."

        try:
            creds = self._get_credentials()
        except Exception as exc:
            return f"[Google Indexing] Auth error: {exc}"

        results = []

        # Submit the article URL
        result = self._submit(creds, url, "URL_UPDATED")
        results.append(f"Article: {result}")

        # Also submit the sitemap
        sitemap_url = f"{_SITE_URL}/sitemap.xml"
        sitemap_result = self._submit(creds, sitemap_url, "URL_UPDATED")
        results.append(f"Sitemap: {sitemap_result}")

        return "[Google Indexing] " + " | ".join(results)

    def _get_credentials(self):
        creds_json = os.environ.get("GOOGLE_CREDENTIALS", "")
        if creds_json:
            from google.oauth2.service_account import Credentials
            return Credentials.from_service_account_info(
                json.loads(creds_json),
                scopes=[_SCOPE],
            )
        else:
            import google.auth
            creds, _ = google.auth.default(scopes=[_SCOPE])
            return creds

    def _submit(self, creds, url: str, notification_type: str) -> str:
        try:
            import urllib.request

            # Refresh credentials to get access token
            import google.auth.transport.requests
            request = google.auth.transport.requests.Request()
            creds.refresh(request)
            token = creds.token

            payload = json.dumps({
                "url":  url,
                "type": notification_type,
            }).encode("utf-8")

            req = urllib.request.Request(
                _ENDPOINT,
                data=payload,
                headers={
                    "Content-Type":  "application/json",
                    "Authorization": f"Bearer {token}",
                },
                method="POST",
            )

            with urllib.request.urlopen(req, timeout=10) as resp:
                body = resp.read().decode("utf-8")
                data = json.loads(body)
                notify_time = data.get("urlNotificationMetadata", {}).get(
                    "latestUpdate", {}
                ).get("notifyTime", "submitted")
                return f"OK ({notify_time})"

        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:200]
            return f"HTTP {exc.code}: {body}"
        except Exception as exc:
            return f"Error: {exc}"
