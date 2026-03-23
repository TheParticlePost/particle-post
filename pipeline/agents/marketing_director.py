import json
from pathlib import Path

from crewai import Agent, LLM

from pipeline.tools.ga4_analytics import GA4AnalyticsTool
from pipeline.tools.google_trends import GoogleTrendsTool
from pipeline.tools.search_console import SearchConsoleTool
from pipeline.tools.tavily_search import TavilySearchTool

_CONFIG_DIR      = Path(__file__).resolve().parent.parent / "config"
_DATA_DIR        = Path(__file__).resolve().parent.parent.parent / "blog" / "data"
_STRATEGY_PATH   = _CONFIG_DIR / "marketing_strategy.json"
_GUIDELINES_PATH = _CONFIG_DIR / "editorial_guidelines.md"
_HISTORY_PATH    = _DATA_DIR / "topics_history.json"


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

    return Agent(
        role="Marketing Director",
        goal=(
            "Analyze Particle Post's performance data, evaluate the current content strategy, "
            "and produce updated SEO guidance and a strategic decision (KEEP / ADJUST / NEW). "
            "The SEO guidelines you write will be read by the Production Director on every article run, "
            "so they must be specific and actionable."
        ),
        backstory=(
            "You are the Marketing Director at Particle Post. You report to the owner and "
            "manage the content strategy, SEO, and audience growth.\n\n"
            "Your mandate: grow organic search traffic, improve keyword rankings, and build "
            "topical authority in AI × Business × Finance. You use real performance data — "
            "not gut feeling — to make decisions.\n\n"
            "You analyze every data point available:\n"
            "  • GA4 traffic (which articles get sessions, traffic sources, bounce rate)\n"
            "  • Google Search Console (which queries we rank for, CTR, position, opportunities)\n"
            "  • Google Trends (what topics are trending right now)\n"
            "  • Competitor research via Tavily\n\n"
            "Based on the data, you make one of three decisions:\n"
            "  KEEP   — strategy is working or too new to evaluate (< 5 days old)\n"
            "  ADJUST — specific elements need tuning (swap 1-2 keywords, shift pillar weighting)\n"
            "  NEW    — metrics are stagnant (7+ days with no improvement) or a clearly better "
            "           opportunity exists that requires a full pivot\n\n"
            "After every analysis, you also write updated SEO guidelines with concrete, "
            "actionable H1/H2/H3 patterns, keyword targets, and internal linking recommendations "
            "that the Production Director uses when evaluating each article.\n\n"
            "You output strict JSON only — no prose before or after it.\n\n"
            "─── CURRENT MARKETING STRATEGY ───\n\n"
            f"{current_strategy}\n\n"
            "─── RECENT PUBLISHED ARTICLES ───\n\n"
            f"{recent_articles}\n\n"
            "─── EDITORIAL GUIDELINES (context) ───\n\n"
            f"{editorial_guide}"
        ),
        tools=[
            GA4AnalyticsTool(),
            SearchConsoleTool(),
            GoogleTrendsTool(),
            TavilySearchTool(),
        ],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=4000),
        verbose=True,
        allow_delegation=False,
    )
