import json
from pathlib import Path

from crewai import Agent, LLM

from pipeline.tools.bing_webmaster import BingCrawlStatsTool, BingPageStatsTool, BingQueryStatsTool
from pipeline.tools.ga4_analytics import GA4AnalyticsTool
from pipeline.tools.google_trends import GoogleTrendsTool
from pipeline.tools.hostinger import HostingerTool
from pipeline.tools.search_console import SearchConsoleTool
from pipeline.tools.tavily_search import TavilySearchTool
from pipeline.tools.pipeline_trigger import PipelineTriggerTool

import os
import urllib.request

_CONFIG_DIR      = Path(__file__).resolve().parent.parent / "config"
_DATA_DIR        = Path(__file__).resolve().parent.parent.parent / "blog" / "data"
_COSTS_DIR       = Path(__file__).resolve().parent.parent / "logs" / "costs"
_STRATEGY_PATH   = _CONFIG_DIR / "marketing_strategy.json"
_GUIDELINES_PATH = _CONFIG_DIR / "editorial_guidelines.md"
_HISTORY_PATH    = _DATA_DIR / "topics_history.json"
_UI_HISTORY_PATH = _CONFIG_DIR / "ui_change_history.json"
_GSO_CONFIG_PATH = _CONFIG_DIR / "seo_gso_config.json"


def _load_current_strategy() -> str:
    """Load and format the current marketing strategy for the agent's context."""
    if not _STRATEGY_PATH.exists():
        return "(No marketing strategy file found — this is the first run.)"
    try:
        data = json.loads(_STRATEGY_PATH.read_text(encoding="utf-8"))
        plan = data.get("current_plan", {})
        baseline = data.get("metrics_baseline", {})
        history  = data.get("decision_history", [])
        lines = [
            f"CURRENT PLAN TYPE: {plan.get('type', 'UNKNOWN')}",
            f"Started: {plan.get('started', '?')}",
            f"Evaluation date: {plan.get('evaluation_date', '?')}",
            f"Content pillar focus: {plan.get('content_pillar_focus', '?')}",
            f"Description: {plan.get('description', '')}",
            f"Target keywords: {', '.join(plan.get('target_keywords', []))}",
            f"Long-tail keywords: {', '.join(plan.get('long_tail_keywords', []))}",
            f"Rationale: {plan.get('rationale', '')}",
            "",
            "METRICS BASELINE (set when plan started):",
            f"  Sessions (7d): {baseline.get('sessions_7d', 0)}",
            f"  Total clicks (28d): {baseline.get('total_clicks_28d', 0)}",
            f"  Total impressions (28d): {baseline.get('total_impressions_28d', 0)}",
            f"  Avg position: {baseline.get('avg_position', 0)}",
        ]
        if history:
            lines.append(f"\nLAST {min(3, len(history))} DECISIONS:")
            for entry in history[-3:]:
                lines.append(f"  {entry.get('date', '?')}: {entry.get('decision', '?')} — {entry.get('rationale', '')[:100]}")
        return "\n".join(lines)
    except Exception as exc:
        return f"(Could not load strategy: {exc})"


def _load_recent_articles() -> str:
    """Load the last 20 published article titles for content gap analysis."""
    if not _HISTORY_PATH.exists():
        return "(No article history yet.)"
    try:
        data = json.loads(_HISTORY_PATH.read_text(encoding="utf-8"))
        posts = data.get("posts", [])[-20:]
        if not posts:
            return "(No articles published yet.)"
        lines = [f"RECENT ARTICLES ({len(posts)} shown, most recent last):"]
        for p in posts:
            lines.append(
                f"  [{p.get('published_at', '?')[:10]}] {p.get('title', '?')} "
                f"(slug: {p.get('slug', '?')})"
            )
        return "\n".join(lines)
    except Exception as exc:
        return f"(Could not load article history: {exc})"


def _load_editorial_guidelines() -> str:
    if _GUIDELINES_PATH.exists():
        return _GUIDELINES_PATH.read_text(encoding="utf-8")
    return "(Editorial guidelines file not found.)"


def _load_ui_change_history() -> str:
    """Load recent UI changes so Marketing Director can track experiments and cooldowns."""
    if not _UI_HISTORY_PATH.exists():
        return "(No UI change history yet — no experiments in progress.)"
    try:
        data    = json.loads(_UI_HISTORY_PATH.read_text(encoding="utf-8"))
        changes = data.get("changes", [])
        if not changes:
            return "(No UI changes recorded yet.)"
        recent = changes[-5:]
        lines  = [f"RECENT UI EXPERIMENTS (last {len(recent)} runs):"]
        for entry in recent:
            date_str = entry.get("date", "?")
            applied  = entry.get("changes_applied", [])
            summary  = entry.get("summary", "")
            if applied:
                for c in applied:
                    lines.append(
                        f"  [{date_str}] {c.get('component', '?')} — "
                        f"{c.get('property', '?')}: "
                        f"{c.get('old_value', '?')} → {c.get('new_value', '?')}"
                    )
            else:
                lines.append(f"  [{date_str}] No changes applied — {summary}")
        lines.append(
            "\nNOTE: When generating UI directives, respect the 7-day cooldown. "
            "Do not target components/properties changed within the last 7 days."
        )
        return "\n".join(lines)
    except Exception as exc:
        return f"(Could not load UI change history: {exc})"


def _load_gso_state() -> str:
    """Load GSO performance state for Marketing Director context."""
    if not _GSO_CONFIG_PATH.exists():
        return "(No GSO data yet — seo_gso_config.json not found.)"
    try:
        data     = json.loads(_GSO_CONFIG_PATH.read_text(encoding="utf-8"))
        coverage = data.get("schema_coverage", {})
        log      = data.get("gso_article_log", [])
        targets  = data.get("keyword_targets", [])
        gaps     = data.get("content_gap_priorities", [])
        audit    = data.get("ai_citation_audit", {})
        lines    = []
        if any(coverage.values()):
            cov_str = " | ".join(f"{k}:{v}" for k, v in coverage.items() if v)
            lines.append(f"Schema coverage to date: {cov_str}")
        lines.append(f"Articles logged: {len(log)}")
        if targets:
            lines.append(f"Current keyword targets: {', '.join(targets)}")
        if gaps:
            lines.append(f"Content gap priorities: {', '.join(gaps)}")
        if audit.get("last_audit_date"):
            p_count = len(audit.get("perplexity_citations", []))
            lines.append(f"Last AI citation audit: {audit['last_audit_date']} — {p_count} Perplexity citations")
        return "\n".join(lines) if lines else "(GSO config present but empty.)"
    except Exception as exc:
        return f"(Could not load GSO state: {exc})"


def _load_cost_summary() -> str:
    """Load pipeline cost summary from the last 14 cost log files."""
    if not _COSTS_DIR.exists():
        return "(No cost data available.)"
    files = sorted(_COSTS_DIR.glob("*.json"), reverse=True)[:14]
    if not files:
        return "(No cost data available.)"

    total_input = 0
    total_output = 0
    total_runs = 0
    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            total_input += data.get("total_input_tokens", 0) or data.get("prompt_tokens", 0)
            total_output += data.get("total_output_tokens", 0) or data.get("completion_tokens", 0)
            total_runs += 1
        except Exception:
            continue

    if total_runs == 0:
        return "(No cost data available.)"

    # Approximate cost: ~60% Sonnet ($3/$15 per 1M), ~40% Haiku ($0.25/$1.25 per 1M)
    est_cost = (total_input * 0.000002 + total_output * 0.00001) * 0.6 + \
               (total_input * 0.0000002 + total_output * 0.000001) * 0.4
    avg_cost = est_cost / max(total_runs, 1)

    return (
        f"PIPELINE COSTS (last {total_runs} runs):\n"
        f"  Total input tokens: {total_input:,}\n"
        f"  Total output tokens: {total_output:,}\n"
        f"  Estimated total cost: ${est_cost:.2f}\n"
        f"  Avg cost per article: ${avg_cost:.2f}"
    )


def _load_subscriber_metrics() -> str:
    """Load subscriber count from Supabase."""
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        return "(Subscriber data not available — Supabase credentials not set.)"

    try:
        req = urllib.request.Request(
            f"{url}/rest/v1/subscribers?select=id,status,subscribed_at&status=eq.active",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())

        total = len(data)
        from datetime import timedelta
        from datetime import datetime as dt
        week_ago = (dt.now().astimezone() - timedelta(days=7)).isoformat()
        recent = sum(1 for s in data if s.get("subscribed_at", "") > week_ago)

        return f"SUBSCRIBERS: {total} active | {recent} new this week"
    except Exception:
        return "(Subscriber data not available.)"


def build_marketing_director() -> Agent:
    """
    Build the Marketing Director agent.

    Runs once daily at noon ET. Collects performance data from GA4, Google Search
    Console, Google Trends, and Tavily; evaluates the current content strategy;
    and decides whether to KEEP, ADJUST, or create a NEW plan.

    Outputs a JSON object that marketing_run.py parses to update strategy files.
    The Production Director reads seo_guidelines.md on every article run.

    Uses claude-sonnet-4-6 — strategic judgment requires the stronger model.
    """
    current_strategy  = _load_current_strategy()
    recent_articles   = _load_recent_articles()
    editorial_guide   = _load_editorial_guidelines()
    ui_history        = _load_ui_change_history()
    gso_state         = _load_gso_state()
    cost_summary      = _load_cost_summary()
    subscriber_metrics = _load_subscriber_metrics()

    return Agent(
        role="Marketing Director",
        goal=(
            "Analyze Particle Post's performance data, evaluate the current content strategy, "
            "produce updated SEO guidance, issue UI change directives when engagement metrics "
            "signal a layout/readability problem, and make a strategic decision (KEEP / ADJUST / NEW). "
            "The SEO guidelines you write are read by the Production Director on every article run."
        ),
        backstory=(
            "You are the Marketing Director at Particle Post. You report to the owner and "
            "manage the content strategy, SEO, audience growth, and site UX improvements.\n\n"
            "Your mandate: grow organic search traffic, improve keyword rankings, build "
            "topical authority in AI × Business × Finance, and improve engagement metrics "
            "(time on page, bounce rate, pages per session). You use real data — not gut feeling.\n\n"
            "You analyze every data point available:\n"
            "  • GA4 traffic (sessions, bounce rate, avg session duration, pages/session, top pages)\n"
            "  • Google Search Console (queries, rankings, CTR, position, opportunities)\n"
            "  • Bing Webmaster Tools (Bing/Edge search queries, impressions, clicks, CTR, avg position)\n"
            "  • Google Trends (trending AI/finance topics right now)\n"
            "  • Competitor research via Tavily\n\n"
            "Bing accounts for ~30% of desktop search. Compare Bing vs Google performance — "
            "if a keyword ranks well on Google but poorly on Bing, that signals a content or "
            "authority gap worth addressing. Use bing_query_stats and bing_page_stats every run.\n\n"
            "Based on the data, you make one of three content strategy decisions:\n"
            "  KEEP   — strategy is working or too new to evaluate (< 5 days old)\n"
            "  ADJUST — specific elements need tuning (swap 1-2 keywords, shift pillar weighting)\n"
            "  NEW    — metrics are stagnant (7+ days with no improvement) or a clearly better "
            "           opportunity exists that requires a full pivot\n\n"
            "═══ UI COMMANDING ═══\n\n"
            "You also analyze GA4 engagement metrics for layout and UX problems. "
            "When you identify a clear metric-backed issue, you issue UI directives that "
            "the UI Designer agent implements at 1pm ET.\n\n"
            "Engagement thresholds that trigger UI directives:\n"
            "  • avg_session_duration < 60s  → readability or layout problem\n"
            "  • bounce_rate > 75%           → hero section or CTA problem\n"
            "  • pages_per_session < 1.5     → navigation or related-content problem\n\n"
            "Targetable UI components (what the UI Designer can change):\n"
            "  post-card  : --gap (24px), card image height (196px), border-radius (12px)\n"
            "  hero       : CTA button text, hero-stats labels, subtitle text, badge text\n"
            "  navigation : subscribe button padding/size\n"
            "  footer     : tagline text\n"
            "  typography : body font-size (0.95rem–1.1rem range), line-height (1.7–1.9 range)\n\n"
            "IMPORTANT: Only issue directives when a threshold is breached. "
            "Respect the 7-day cooldown — do not target components changed within the last 7 days. "
            "If metrics are healthy or data is too sparse, set ui_directives to null.\n\n"
            "You output strict JSON only — no prose before or after it.\n\n"
            "═══ SEO/GSO COLLABORATION ═══\n\n"
            "You work directly with the SEO/GSO Specialist every day at noon. "
            "Your analysis feeds into their keyword targeting and content gap strategy. "
            "They run immediately after you and convert your findings into actionable SEO directives. "
            "At the end of your output, include a ===GSO_HANDOFF=== section (see Step 7) "
            "with structured keyword and content gap data for the SEO agent.\n\n"
            "─── GSO PERFORMANCE STATE ───\n\n"
            f"{gso_state}\n\n"
            "─── CURRENT MARKETING STRATEGY ───\n\n"
            f"{current_strategy}\n\n"
            "─── RECENT PUBLISHED ARTICLES ───\n\n"
            f"{recent_articles}\n\n"
            "─── UI EXPERIMENT HISTORY ───\n\n"
            f"{ui_history}\n\n"
            "─── PIPELINE COSTS ───\n\n"
            f"{cost_summary}\n\n"
            "─── SUBSCRIBER GROWTH ───\n\n"
            f"{subscriber_metrics}\n\n"
            "─── EDITORIAL GUIDELINES (context) ───\n\n"
            f"{editorial_guide}"
        ),
        tools=[
            GA4AnalyticsTool(),
            SearchConsoleTool(),
            BingQueryStatsTool(),
            BingPageStatsTool(),
            BingCrawlStatsTool(),
            GoogleTrendsTool(),
            TavilySearchTool(),
            HostingerTool(),
            PipelineTriggerTool(),
        ],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=8192),
        verbose=True,
        allow_delegation=False,
    )
