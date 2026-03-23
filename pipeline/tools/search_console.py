import json
import os
from datetime import datetime, timedelta

from crewai.tools import BaseTool


class SearchConsoleTool(BaseTool):
    """
    Query Google Search Console for keyword rankings and search performance.

    Requires environment variables:
      GOOGLE_CREDENTIALS  — full Service Account JSON as a string
      GSC_SITE_URL        — e.g. "https://theparticlepost.com"

    The service account must be added as a user in GSC Settings → Users and permissions.
    """

    name: str = "search_console"
    description: str = (
        "Query Google Search Console for keyword and page performance data.\n"
        "Input: query_type — one of:\n"
        "  'top_queries'    — top 25 clicked search queries with impressions, CTR, avg position (28 days)\n"
        "  'top_pages'      — top 20 clicked pages with impression data (28 days)\n"
        "  'opportunities'  — queries ranking position 5-20 with 50+ impressions: "
        "highest-leverage targets for content optimization"
    )

    def _run(self, query_type: str = "top_queries") -> str:  # noqa: C901
        creds_json = os.environ.get("GOOGLE_CREDENTIALS", "")
        site_url   = os.environ.get("GSC_SITE_URL", "https://theparticlepost.com")

        try:
            from googleapiclient.discovery import build
        except ImportError:
            return "[GSC] google-api-python-client not installed. Run: pip install google-api-python-client google-auth"

        try:
            if creds_json:
                # Local dev: explicit service account JSON in env var
                from google.oauth2.service_account import Credentials
                creds = Credentials.from_service_account_info(
                    json.loads(creds_json),
                    scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
                )
            else:
                # GitHub Actions (WIF): use Application Default Credentials
                import google.auth
                creds, _ = google.auth.default(
                    scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
                )
            service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

            end_date   = datetime.now().strftime("%Y-%m-%d")
            start_date = (datetime.now() - timedelta(days=28)).strftime("%Y-%m-%d")

            # ── top_queries ───────────────────────────────────────────────
            if query_type in ("top_queries", "opportunities"):
                body = {
                    "startDate": start_date,
                    "endDate":   end_date,
                    "dimensions": ["query"],
                    "rowLimit":   50,
                    "startRow":   0,
                }
                result = (
                    service.searchanalytics()
                    .query(siteUrl=site_url, body=body)
                    .execute()
                )
                rows = result.get("rows", [])

                if not rows:
                    return (
                        f"[GSC] No {query_type} data yet — site may be too new for Google to index. "
                        "Check back after the site has been live for 1-2 weeks."
                    )

                if query_type == "top_queries":
                    lines = [f"═══ GSC Top Queries — last 28 days ═══\n"]
                    for row in rows[:25]:
                        q    = row.get("keys", [""])[0]
                        cl   = int(row.get("clicks", 0))
                        imp  = int(row.get("impressions", 0))
                        ctr  = row.get("ctr", 0)
                        pos  = row.get("position", 0)
                        lines.append(
                            f"  '{q}'  |  {cl} clicks  |  {imp} impr  |  "
                            f"{ctr:.1%} CTR  |  pos {pos:.1f}"
                        )
                    return "\n".join(lines)

                else:  # opportunities
                    opps = [
                        r for r in rows
                        if 5 <= r.get("position", 0) <= 20
                        and r.get("impressions", 0) >= 50
                    ]
                    if not opps:
                        return (
                            "[GSC] No ranking opportunities found yet — site may be too new. "
                            "Opportunities appear when queries have 50+ impressions and rank 5-20."
                        )
                    lines = [
                        "═══ GSC Ranking Opportunities (pos 5-20, 50+ impressions) ═══\n",
                        "These queries already rank on page 1-2. "
                        "Improving content targeting could push them into top 3.\n",
                    ]
                    for row in opps[:20]:
                        q    = row.get("keys", [""])[0]
                        imp  = int(row.get("impressions", 0))
                        pos  = row.get("position", 0)
                        ctr  = row.get("ctr", 0)
                        cl   = int(row.get("clicks", 0))
                        lines.append(
                            f"  '{q}'  |  pos {pos:.1f}  |  {imp} impr  |  "
                            f"{ctr:.1%} CTR  |  {cl} clicks  ← optimize"
                        )
                    return "\n".join(lines)

            # ── top_pages ─────────────────────────────────────────────────
            elif query_type == "top_pages":
                body = {
                    "startDate":  start_date,
                    "endDate":    end_date,
                    "dimensions": ["page"],
                    "rowLimit":   20,
                }
                result = (
                    service.searchanalytics()
                    .query(siteUrl=site_url, body=body)
                    .execute()
                )
                rows = result.get("rows", [])
                if not rows:
                    return "[GSC] No page data yet. Check back after the site has been indexed."
                lines = ["═══ GSC Top Pages — last 28 days ═══\n"]
                for row in rows:
                    page = row.get("keys", [""])[0]
                    cl   = int(row.get("clicks", 0))
                    imp  = int(row.get("impressions", 0))
                    pos  = row.get("position", 0)
                    lines.append(f"  {page}  |  {cl} clicks  |  {imp} impr  |  avg pos {pos:.1f}")
                return "\n".join(lines)

            else:
                return f"[GSC] Unknown query_type '{query_type}'. Use: top_queries, top_pages, opportunities"

        except Exception as exc:
            return f"[GSC] Error: {exc}"
