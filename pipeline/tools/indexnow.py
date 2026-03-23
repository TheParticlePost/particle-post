"""
IndexNow tool — pings Bing, Edge, Yandex, and DuckDuckGo after each article publish.

IndexNow is an open protocol supported by multiple search engines.
A single ping to api.indexnow.org reaches all participating engines.

Setup:
  1. Generate a 32-char hex key: python -c "import secrets; print(secrets.token_hex(16))"
  2. Create blog/static/{key}.txt containing only the key string
  3. Add INDEXNOW_KEY={key} as a GitHub Actions secret

No additional API registration needed — the key file at the URL is the verification.
"""

import json
import os
import urllib.error
import urllib.request

from crewai.tools import BaseTool

_HOST     = "theparticlepost.com"
_ENDPOINT = "https://api.indexnow.org/indexnow"


class IndexNowTool(BaseTool):
    name: str = "indexnow_submit"
    description: str = (
        "Submit a URL to IndexNow (Bing, Edge, Yandex, DuckDuckGo) for immediate indexing. "
        "Input: full article URL (e.g. 'https://theparticlepost.com/posts/slug/')."
    )

    def _run(self, url: str) -> str:
        url = url.strip()
        if not url:
            return "[IndexNow] No URL provided."

        key = os.environ.get("INDEXNOW_KEY", "")
        if not key:
            return "[IndexNow] INDEXNOW_KEY not set — skipping submission."

        key_location = f"https://{_HOST}/{key}.txt"

        payload = json.dumps({
            "host":        _HOST,
            "key":         key,
            "keyLocation": key_location,
            "urlList":     [url],
        }).encode("utf-8")

        try:
            req = urllib.request.Request(
                _ENDPOINT,
                data=payload,
                headers={"Content-Type": "application/json; charset=utf-8"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.status
                if status in (200, 202):
                    return f"OK (HTTP {status}) — submitted to Bing/Edge/Yandex/DuckDuckGo"
                return f"Unexpected status HTTP {status}"

        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")[:200]
            # 422 = URL already submitted recently (not an error)
            if exc.code == 422:
                return f"Already submitted recently (HTTP 422) — no action needed"
            return f"HTTP {exc.code}: {body}"
        except Exception as exc:
            return f"Error: {exc}"
