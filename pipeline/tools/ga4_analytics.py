import json
import os

from crewai.tools import BaseTool


class GA4AnalyticsTool(BaseTool):
    """
    Fetch website traffic metrics from Google Analytics 4 via the Data API.

    Requires environment variables:
      GOOGLE_CREDENTIALS  — full Service Account JSON as a string
      GA4_PROPERTY_ID     — numeric property ID (e.g. "123456789")

    Returns a formatted text report — no JSON, so the LLM can reason over it directly.
    """

    name: str = "ga4_analytics"
    description: str = (
        "Fetch website traffic metrics from Google Analytics 4.\n"
        "Input: period — '7d' for last 7 days or '30d' for last 30 days.\n"
        "Returns: total sessions, page views, bounce rate, average session duration, "
        "top 20 pages by sessions, and traffic source breakdown."
    )

    def _run(self, period: str = "7d") -> str:  # noqa: C901
        creds_json = os.environ.get("GOOGLE_CREDENTIALS", "")
        property_id = os.environ.get("GA4_PROPERTY_ID", "")

        if not creds_json or not property_id:
            return (
                "[GA4] Not configured — set GOOGLE_CREDENTIALS and GA4_PROPERTY_ID secrets. "
                "Proceeding with Trends and Search Console data only."
            )

        try:
            from google.analytics.data_v1beta import BetaAnalyticsDataClient
            from google.analytics.data_v1beta.types import (
                DateRange,
                Dimension,
                Metric,
                OrderBy,
                RunReportRequest,
            )
            from google.oauth2.service_account import Credentials
        except ImportError:
            return "[GA4] google-analytics-data package not installed. Run: pip install google-analytics-data"

        try:
            creds_dict = json.loads(creds_json)
            creds = Credentials.from_service_account_info(
                creds_dict,
                scopes=["https://www.googleapis.com/auth/analytics.readonly"],
            )
            client = BetaAnalyticsDataClient(credentials=creds)
            days = "7" if period == "7d" else "30"
            prop = f"properties/{property_id}"
            date_range = [DateRange(start_date=f"{days}daysAgo", end_date="today")]
            lines: list[str] = [f"═══ GA4 Analytics — Last {days} days ═══\n"]

            # ── Overview metrics ──────────────────────────────────────────
            overview_req = RunReportRequest(
                property=prop,
                date_ranges=date_range,
                metrics=[
                    Metric(name="sessions"),
                    Metric(name="screenPageViews"),
                    Metric(name="bounceRate"),
                    Metric(name="averageSessionDuration"),
                    Metric(name="newUsers"),
                ],
            )
            overview = client.run_report(overview_req)
            if overview.rows:
                r = overview.rows[0]
                sessions   = r.metric_values[0].value
                views      = r.metric_values[1].value
                bounce     = float(r.metric_values[2].value or 0)
                duration   = float(r.metric_values[3].value or 0)
                new_users  = r.metric_values[4].value
                lines.append(f"Sessions:               {sessions}")
                lines.append(f"Page Views:             {views}")
                lines.append(f"New Users:              {new_users}")
                lines.append(f"Bounce Rate:            {bounce:.1%}")
                lines.append(f"Avg Session Duration:   {duration:.0f}s ({duration/60:.1f} min)")

            # ── Top pages by sessions ────────────────────────────────────
            pages_req = RunReportRequest(
                property=prop,
                date_ranges=date_range,
                dimensions=[Dimension(name="pagePath"), Dimension(name="pageTitle")],
                metrics=[Metric(name="sessions"), Metric(name="screenPageViews")],
                order_bys=[
                    OrderBy(
                        metric=OrderBy.MetricOrderBy(metric_name="sessions"),
                        desc=True,
                    )
                ],
                limit=20,
            )
            pages = client.run_report(pages_req)
            lines.append("\nTop 20 Pages by Sessions:")
            for row in pages.rows:
                path    = row.dimension_values[0].value
                title   = row.dimension_values[1].value[:60]
                sess    = row.metric_values[0].value
                pv      = row.metric_values[1].value
                lines.append(f"  {path}  |  {sess} sessions  |  {pv} views  |  {title}")

            # ── Traffic sources ──────────────────────────────────────────
            source_req = RunReportRequest(
                property=prop,
                date_ranges=date_range,
                dimensions=[Dimension(name="sessionDefaultChannelGrouping")],
                metrics=[Metric(name="sessions"), Metric(name="newUsers")],
                order_bys=[
                    OrderBy(
                        metric=OrderBy.MetricOrderBy(metric_name="sessions"),
                        desc=True,
                    )
                ],
            )
            sources = client.run_report(source_req)
            lines.append("\nTraffic Sources:")
            for row in sources.rows:
                channel   = row.dimension_values[0].value
                s         = row.metric_values[0].value
                n         = row.metric_values[1].value
                lines.append(f"  {channel}: {s} sessions  ({n} new users)")

            return "\n".join(lines)

        except Exception as exc:
            return f"[GA4] Error fetching data: {exc}"
