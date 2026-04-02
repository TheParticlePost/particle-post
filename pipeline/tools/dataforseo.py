"""
DataForSEO Tool — CrewAI BaseTool for SEO data retrieval.

Provides keyword rankings, backlink analysis, and domain metrics
via the DataForSEO API. Uses stdlib urllib (no external deps).

Environment variables:
    DATAFORSEO_LOGIN    — DataForSEO account login (email)
    DATAFORSEO_PASSWORD — DataForSEO account password

Query format (passed as the `query` argument):
    "keywords:term1,term2"       — keyword search volume & difficulty
    "backlinks:example.com"      — backlink summary for a domain
    "audit:example.com"          — on-page SEO audit for a domain
    "ranked:example.com"         — top ranked keywords for a domain
    "competitors:example.com"    — competitor domains

Examples:
    tool._run("keywords:ai business strategy,enterprise ai")
    tool._run("backlinks:theparticlepost.com")
    tool._run("audit:theparticlepost.com")
"""

import base64
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from crewai.tools import BaseTool


_API_BASE = "https://api.dataforseo.com/v3"


class DataForSEOTool(BaseTool):
    name: str = "dataforseo_search"
    description: str = (
        "Get SEO data (keyword rankings, backlinks, domain metrics) from DataForSEO API. "
        "Input format: 'keywords:term1,term2' for search volume, "
        "'backlinks:domain' for backlink data, 'audit:domain' for on-page audit, "
        "'ranked:domain' for top keywords, 'competitors:domain' for competitors."
    )

    def _get_auth_header(self) -> str:
        """Build HTTP Basic Auth header from env vars."""
        login = os.environ.get("DATAFORSEO_LOGIN", "")
        password = os.environ.get("DATAFORSEO_PASSWORD", "")
        if not login or not password:
            raise ValueError(
                "DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD environment variables required"
            )
        credentials = f"{login}:{password}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    def _api_post(self, endpoint: str, payload: list[dict]) -> dict:
        """POST to DataForSEO API and return parsed JSON response."""
        url = f"{_API_BASE}{endpoint}"
        data = json.dumps(payload).encode("utf-8")
        req = Request(url, data=data, method="POST")
        req.add_header("Authorization", self._get_auth_header())
        req.add_header("Content-Type", "application/json")

        try:
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as e:
            body = e.read().decode("utf-8", errors="replace")
            return {"error": f"HTTP {e.code}: {body[:500]}"}
        except URLError as e:
            return {"error": f"URL error: {e.reason}"}
        except Exception as e:
            return {"error": str(e)}

    def _keywords(self, terms: list[str]) -> str:
        """Get search volume and keyword difficulty."""
        payload = [{"keywords": terms, "location_code": 2840, "language_code": "en"}]
        resp = self._api_post("/keywords_data/google_ads/search_volume/live", payload)

        if "error" in resp:
            return f"DataForSEO error: {resp['error']}"

        results = []
        tasks = resp.get("tasks", [])
        for task in tasks:
            for item in task.get("result", []) or []:
                keyword = item.get("keyword", "")
                vol = item.get("search_volume", 0)
                cpc = item.get("cpc", 0)
                comp = item.get("competition", "N/A")
                comp_idx = item.get("competition_index", 0)
                results.append(
                    f"  {keyword}: vol={vol}, cpc=${cpc:.2f}, "
                    f"competition={comp} (index={comp_idx})"
                )

        if not results:
            return "No keyword data returned."
        return "KEYWORD DATA:\n" + "\n".join(results)

    def _backlinks(self, domain: str) -> str:
        """Get backlink summary for a domain."""
        payload = [{"target": domain, "limit": 10}]
        resp = self._api_post("/backlinks/summary/live", payload)

        if "error" in resp:
            return f"DataForSEO error: {resp['error']}"

        results = []
        tasks = resp.get("tasks", [])
        for task in tasks:
            for item in task.get("result", []) or []:
                results.append(
                    f"  Total backlinks: {item.get('total_backlinks', 0)}\n"
                    f"  Referring domains: {item.get('referring_domains', 0)}\n"
                    f"  Referring IPs: {item.get('referring_ips', 0)}\n"
                    f"  Domain rank: {item.get('rank', 0)}\n"
                    f"  Broken backlinks: {item.get('broken_backlinks', 0)}\n"
                    f"  Referring domains nofollow: {item.get('referring_domains_nofollow', 0)}"
                )

        if not results:
            return "No backlink data returned."
        return f"BACKLINK SUMMARY for {domain}:\n" + "\n".join(results)

    def _audit(self, domain: str) -> str:
        """Get on-page SEO audit summary."""
        payload = [{"target": domain, "max_crawl_pages": 10}]
        resp = self._api_post("/on_page/summary", payload)

        if "error" in resp:
            return f"DataForSEO error: {resp['error']}"

        results = []
        tasks = resp.get("tasks", [])
        for task in tasks:
            for item in task.get("result", []) or []:
                crawl = item.get("crawl_progress", "unknown")
                pages = item.get("pages_count", 0)
                checks = item.get("checks", {})
                results.append(
                    f"  Crawl status: {crawl}\n"
                    f"  Pages crawled: {pages}\n"
                    f"  Checks summary: {json.dumps(checks, indent=2)[:800]}"
                )

        if not results:
            return "No audit data returned."
        return f"ON-PAGE AUDIT for {domain}:\n" + "\n".join(results)

    def _ranked_keywords(self, domain: str) -> str:
        """Get top ranked keywords for a domain."""
        payload = [{"target": domain, "limit": 20, "location_code": 2840, "language_code": "en"}]
        resp = self._api_post("/dataforseo_labs/google/ranked_keywords/live", payload)

        if "error" in resp:
            return f"DataForSEO error: {resp['error']}"

        results = []
        tasks = resp.get("tasks", [])
        for task in tasks:
            for item in task.get("result", []) or []:
                total = item.get("total_count", 0)
                results.append(f"  Total ranked keywords: {total}")
                for kw_item in (item.get("items") or [])[:20]:
                    kw_data = kw_item.get("keyword_data", {})
                    keyword = kw_data.get("keyword", "")
                    ranked = kw_item.get("ranked_serp_element", {})
                    pos = ranked.get("serp_item", {}).get("rank_absolute", "?")
                    vol = kw_data.get("keyword_info", {}).get("search_volume", 0)
                    results.append(f"  #{pos} — {keyword} (vol={vol})")

        if not results:
            return "No ranked keyword data returned."
        return f"RANKED KEYWORDS for {domain}:\n" + "\n".join(results)

    def _competitors(self, domain: str) -> str:
        """Get competitor domains."""
        payload = [{"target": domain, "limit": 10, "location_code": 2840, "language_code": "en"}]
        resp = self._api_post("/dataforseo_labs/google/competitors_domain/live", payload)

        if "error" in resp:
            return f"DataForSEO error: {resp['error']}"

        results = []
        tasks = resp.get("tasks", [])
        for task in tasks:
            for item in task.get("result", []) or []:
                for comp in (item.get("items") or [])[:10]:
                    domain_name = comp.get("domain", "")
                    avg_pos = comp.get("avg_position", 0)
                    intersections = comp.get("intersections", 0)
                    visibility = comp.get("full_domain_metrics", {}).get("organic", {}).get("pos_1", 0)
                    results.append(
                        f"  {domain_name}: avg_pos={avg_pos:.1f}, "
                        f"shared_keywords={intersections}, top1_keywords={visibility}"
                    )

        if not results:
            return "No competitor data returned."
        return f"COMPETITORS for {domain}:\n" + "\n".join(results)

    def _run(self, query: str) -> str:
        """Parse query format and dispatch to the appropriate method.

        Formats:
            keywords:term1,term2
            backlinks:domain.com
            audit:domain.com
            ranked:domain.com
            competitors:domain.com
        """
        if not query or ":" not in query:
            return (
                "Invalid query format. Use one of:\n"
                "  keywords:term1,term2\n"
                "  backlinks:domain.com\n"
                "  audit:domain.com\n"
                "  ranked:domain.com\n"
                "  competitors:domain.com"
            )

        action, _, value = query.partition(":")
        action = action.strip().lower()
        value = value.strip()

        if not value:
            return f"No value provided for action '{action}'."

        try:
            if action == "keywords":
                terms = [t.strip() for t in value.split(",") if t.strip()]
                if not terms:
                    return "No keywords provided."
                return self._keywords(terms)
            elif action == "backlinks":
                return self._backlinks(value)
            elif action == "audit":
                return self._audit(value)
            elif action == "ranked":
                return self._ranked_keywords(value)
            elif action == "competitors":
                return self._competitors(value)
            else:
                return (
                    f"Unknown action '{action}'. Use: keywords, backlinks, "
                    "audit, ranked, or competitors."
                )
        except ValueError as e:
            return f"Configuration error: {e}"
        except Exception as e:
            return f"DataForSEO error: {type(e).__name__}: {e}"
