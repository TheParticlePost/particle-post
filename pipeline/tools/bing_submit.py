"""
Bing Webmaster Tools URL Submission API tool.

Submits URLs directly to Bing for indexing via the Bing Webmaster API.
This complements IndexNow (which is the preferred modern approach).

Setup:
  1. Register at bing.com/webmasters and verify theparticlepost.com
  2. Go to Settings → API Access → Generate API Key
  3. Add BING_WEBMASTER_KEY={key} as a GitHub Actions secret
"""

import json
import os
import urllib.error
import urllib.parse
import urllib.request

from crewai.tools import BaseTool

_SITE_URL = "https://theparticlepost.com"
_ENDPOINT = "https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch"


class BingSubmitTool(BaseTool):
    name: str = "bing_submit"
    description: str = (
        "Submit a URL to Bing Webmaster Tools for indexing. "
        "Input: full article URL (e.g. 'https://theparticlepost.com/posts/slug/'). "
        "Use this in addition to indexnow_submit for belt-and-suspenders Bing coverage."
    )

    def _run(self, url: str) -> str:
        url = url.strip()
        if not url:
            return "[Bing Submit] No URL provided."

        key = os.environ.get("BING_WEBMASTER_KEY", "")
        if not key:
            return "[Bing Submit] BING_WEBMASTER_KEY not set — skipping submission."

        api_url = f"{_ENDPOINT}?apikey={urllib.parse.quote(key)}"

        payload = json.dumps({
            "siteUrl": _SITE_URL,
            "urlList": [url],
        }).encode("utf-8")

        try:
            req = urllib.request.Request(
                api_url,
                data=payload,
                headers={"Content-Type": "application/json; charset=utf-8"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.status
                body   = resp.read().decode("utf-8", errors="replace")
                if status == 200:
                    return f"OK — submitted to Bing Webmaster Tools"
                return f"HTTP {status}: {body[:200]}"

        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:200]
            return f"HTTP {exc.code}: {body}"
        except Exception as exc:
            return f"Error: {exc}"
