"""
Bing Webmaster Tools analytics tool for the Marketing Director.

Reads search performance data (queries, pages, crawl stats) from Bing.
Complements GA4 and GSC data for a full cross-engine picture.

Setup:
  Add BING_WEBMASTER_KEY as a GitHub Actions secret.
  Get the key from: bing.com/webmasters → Settings → API Access
"""

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

from crewai.tools import BaseTool

_SITE_URL   = "https://theparticlepost.com"
_BASE       = "https://ssl.bing.com/webmaster/api.svc/json"


def _get(endpoint: str, params: dict) -> dict:
    key = os.environ.get("BING_WEBMASTER_KEY", "")
    if not key:
        return {"error": "BING_WEBMASTER_KEY not set"}
    params["apikey"] = key
    url = f"{_BASE}/{endpoint}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:300]
        return {"error": f"HTTP {e.code}: {body}"}
    except Exception as e:
        return {"error": str(e)}


class BingQueryStatsTool(BaseTool):
    name: str = "bing_query_stats"
    description: str = (
        "Get Bing search query performance for theparticlepost.com. "
        "Returns top queries with impressions, clicks, CTR, and avg position for the past 30 days. "
        "Use to understand which topics Bing users are searching for and finding our site with. "
        "Input: any string (ignored — always returns last 30 days)."
    )

    def _run(self, _: str = "") -> str:
        today = datetime.now(timezone.utc)
        start = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        end   = (today - timedelta(days=1)).strftime("%Y-%m-%d")

        data = _get("GetQueryStats", {
            "siteUrl":   _SITE_URL,
            "startDate": start,
            "endDate":   end,
            "page":      0,
        })

        if "error" in data:
            return f"[Bing Query Stats] {data['error']}"

        queries = data.get("d", {}).get("results", []) if isinstance(data.get("d"), dict) else data.get("d", [])
        if not queries:
            return "[Bing Query Stats] No query data available yet (site may be too new)."

        lines = [f"Bing query stats ({start} → {end}):"]
        for q in queries[:20]:
            impressions = q.get("Impressions", 0)
            clicks      = q.get("Clicks", 0)
            ctr         = round(q.get("CTR", 0) * 100, 1)
            position    = round(q.get("AvgClickPosition", 0), 1)
            query       = q.get("Query", "")
            lines.append(
                f"  [{clicks} clicks / {impressions} impr / {ctr}% CTR / pos {position}] {query}"
            )
        return "\n".join(lines)


class BingPageStatsTool(BaseTool):
    name: str = "bing_page_stats"
    description: str = (
        "Get Bing search performance by page URL for theparticlepost.com. "
        "Returns top pages by impressions and clicks from Bing organic search. "
        "Input: any string (ignored — always returns last 30 days)."
    )

    def _run(self, _: str = "") -> str:
        today = datetime.now(timezone.utc)
        start = (today - timedelta(days=30)).strftime("%Y-%m-%d")
        end   = (today - timedelta(days=1)).strftime("%Y-%m-%d")

        data = _get("GetPageStats", {
            "siteUrl":   _SITE_URL,
            "startDate": start,
            "endDate":   end,
            "page":      0,
        })

        if "error" in data:
            return f"[Bing Page Stats] {data['error']}"

        pages = data.get("d", {}).get("results", []) if isinstance(data.get("d"), dict) else data.get("d", [])
        if not pages:
            return "[Bing Page Stats] No page data available yet."

        lines = [f"Bing page stats ({start} → {end}):"]
        for p in pages[:15]:
            impressions = p.get("Impressions", 0)
            clicks      = p.get("Clicks", 0)
            ctr         = round(p.get("CTR", 0) * 100, 1)
            url         = p.get("Url", "").replace(_SITE_URL, "")
            lines.append(f"  [{clicks} clicks / {impressions} impr / {ctr}% CTR] {url}")
        return "\n".join(lines)


class BingCrawlStatsTool(BaseTool):
    name: str = "bing_crawl_stats"
    description: str = (
        "Get Bing crawl statistics for theparticlepost.com. "
        "Shows crawl errors, pages crawled, and indexing health. "
        "Input: any string (ignored)."
    )

    def _run(self, _: str = "") -> str:
        data = _get("GetCrawlStats", {"siteUrl": _SITE_URL})

        if "error" in data:
            return f"[Bing Crawl Stats] {data['error']}"

        stats = data.get("d", {})
        if not stats:
            return "[Bing Crawl Stats] No crawl data available."

        lines = ["Bing crawl stats:"]
        for key, val in stats.items():
            if key not in ("__type",):
                lines.append(f"  {key}: {val}")
        return "\n".join(lines)
