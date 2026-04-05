import json
from datetime import datetime, timezone
from pathlib import Path
from crewai import Task
from crewai import Agent

from pipeline.utils.research_memory import get_research_context

HISTORY_FILE = Path(__file__).parents[2] / "blog" / "data" / "topics_history.json"

# Industry rotation for industry_briefing content type (6-week cycle)
_INDUSTRIES = [
    "Logistics & Supply Chain",
    "Manufacturing",
    "Healthcare",
    "Professional Services",
    "Retail & E-Commerce",
    "Energy & Utilities",
]

# Content-type-specific search strategies
SEARCH_STRATEGIES: dict[str, dict] = {
    "news_analysis": {
        "base_queries": (
            "1. Use google_trends tool to get current US trending topics.\n"
            "2. Use newsapi_fetch with query 'artificial intelligence business' to get recent headlines.\n"
            "3. Use tavily_search with 'AI enterprise news today' and 'AI business developments this week'.\n"
            "4. Use tavily_search with 'AI regulation policy update this week' to find regulatory changes.\n"
            "5. Synthesize findings into a structured briefing.\n"
        ),
        "guidance": (
            "Focus on the LAST 24 HOURS. Lead with what's genuinely new. "
            "Every topic must name a company, regulator, or research institution. "
            "Each must answer: 'What should the reader DO about this?'"
        ),
    },
    "deep_dive": {
        "base_queries": (
            "1. Use tavily_search with 'AI research study findings 2026' to find academic/industry research.\n"
            "2. Use tavily_search with 'McKinsey Deloitte Gartner AI report 2026' to find analyst research.\n"
            "3. Use tavily_search with 'AI enterprise adoption failure lessons' to find contrarian angles.\n"
            "4. Use tavily_search with 'AI workforce productivity data' to find quantified impacts.\n"
            "5. Use google_trends to check for trending AI topics suitable for deep-dive analysis.\n"
            "6. Synthesize findings into a structured briefing.\n"
        ),
        "guidance": (
            "Find topics with DEPTH: studies with sample sizes, multi-year data, "
            "or surprising counter-narratives. The best deep dives challenge conventional wisdom. "
            "Look for research that executives are misusing or misinterpreting."
        ),
    },
    "case_study": {
        "base_queries": (
            "1. Use tavily_search with 'company deployed AI results ROI 2026' to find deployment outcomes.\n"
            "2. Use tavily_search with 'AI implementation case study timeline cost savings' to find real deployments.\n"
            "3. Use tavily_search with 'enterprise AI pilot production deployment lessons' to find practical stories.\n"
            "4. Use newsapi_fetch with query 'artificial intelligence deployment results' to find recent announcements.\n"
            "5. Synthesize findings into a structured briefing.\n"
        ),
        "guidance": (
            "Find SPECIFIC COMPANIES with MEASURABLE OUTCOMES. The ideal case study has: "
            "company name, industry, timeline, investment amount, technology used, "
            "and before/after metrics. Earnings calls, press releases, and vendor blogs "
            "are good sources. Look beyond finance: logistics, manufacturing, HR deployments."
        ),
    },
    "how_to": {
        "base_queries": (
            "1. Use tavily_search with 'how to deploy AI agents enterprise step by step 2026' to find guides.\n"
            "2. Use tavily_search with 'AI tool implementation guide prerequisites' to find practical instructions.\n"
            "3. Use tavily_search with 'AI deployment failure common mistakes avoid' to find failure patterns.\n"
            "4. Use tavily_search with 'AI vendor comparison pricing enterprise' to find tool selection guidance.\n"
            "5. Synthesize findings into a structured briefing.\n"
        ),
        "guidance": (
            "Find topics where readers need SPECIFIC STEPS. The best how-to topics have: "
            "a clear tool/platform, defined prerequisites, and known failure modes. "
            "Avoid generic 'how to use AI'. Target specific use cases: AP automation, "
            "fraud detection, predictive maintenance, workforce planning."
        ),
    },
    "technology_profile": {
        "base_queries": (
            "1. Use tavily_search with 'AI platform comparison enterprise 2026' to find vendor landscapes.\n"
            "2. Use tavily_search with 'agentic AI vendor capabilities pricing' to find product evaluations.\n"
            "3. Use tavily_search with 'AI tool maturity assessment production ready' to find maturity analysis.\n"
            "4. Use tavily_search with 'Gartner Forrester AI platform ranking 2026' to find analyst evaluations.\n"
            "5. Synthesize findings into a structured briefing.\n"
        ),
        "guidance": (
            "Find TECHNOLOGY CATEGORIES with 2+ competing vendors. The ideal technology profile "
            "covers: what the technology does, 2-3 vendors compared, pricing, maturity level, "
            "and when to adopt vs. wait. Avoid single-vendor profiles (that's marketing)."
        ),
    },
    "industry_briefing": {
        "base_queries": (
            "1. Use tavily_search with 'AI {industry} news this week 2026' to find sector-specific news.\n"
            "2. Use tavily_search with 'AI {industry} deployment case study' to find sector implementations.\n"
            "3. Use newsapi_fetch with query '{industry} artificial intelligence' to find sector headlines.\n"
            "4. Use google_trends to check for trending topics in {industry}.\n"
            "5. Synthesize findings into a structured briefing.\n"
        ),
        "guidance": (
            "Find 3-4 developments in the ROTATING INDUSTRY for this week. "
            "Each development must name a company and have a 'So What' for operators. "
            "Rotating industries: Logistics & Supply Chain, Manufacturing, Healthcare, "
            "Professional Services, Retail & E-Commerce, Energy & Utilities."
        ),
    },
}


def _get_current_industry() -> str:
    """Get the current rotating industry based on week number."""
    week = datetime.now(timezone.utc).isocalendar()[1]
    return _INDUSTRIES[(week % 6)]


def _build_topic_archive(limit: int = 100) -> str:
    """Build a compact archive of recent articles for the researcher's memory.

    Format: one line per article, ~40 chars each: "YYYY-MM-DD | slug-excerpt | tag1, tag2"
    Total: ~4K chars / ~1K tokens for 100 articles.
    """
    if not HISTORY_FILE.exists():
        return ""
    try:
        history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        posts = history.get("posts", [])[-limit:]
    except (json.JSONDecodeError, KeyError):
        return ""

    if not posts:
        return ""

    lines = []
    for p in posts:
        date = p.get("filename", "")[:10] or "????"
        slug = p.get("slug", "")[:40]
        tags = ", ".join(t[:15] for t in p.get("tags", [])[:3])
        lines.append(f"{date} | {slug} | {tags}")
    return "\n".join(lines)


def build_research_task(agent: Agent, content_type: str = "news_analysis", topic_override: str | None = None) -> Task:
    # Resolve strategy for the given content type
    strategy = SEARCH_STRATEGIES.get(content_type, SEARCH_STRATEGIES["news_analysis"])

    # For industry_briefing, substitute the current rotating industry
    industry = _get_current_industry()
    base_steps = strategy["base_queries"].replace("{industry}", industry)
    content_guidance = strategy["guidance"].replace("{industry}", industry)

    # Load research memory context (overused queries, under-covered domains, content gaps)
    memory_context = get_research_context(content_type)
    memory_block = ""
    if memory_context:
        memory_block = (
            "══ RESEARCH MEMORY (learn from past runs) ══\n"
            f"{memory_context}\n"
        )

    topic_directive = ""
    if topic_override:
        topic_directive = (
            f"MANDATORY TOPIC DIRECTIVE: The editor has requested coverage of this specific topic:\n"
            f'"{topic_override}"\n\n'
            f"You MUST include this topic as the #1 item in your research briefing. "
            f"Research it thoroughly using tavily_search with queries related to the topic. "
            f"Find recent news articles, technical details, expert analysis, and implications. "
            f"Still include 4-5 other trending topics, but the directed topic MUST be first and most detailed.\n\n"
        )

    # Build compact archive of last 100 articles to prevent topic repetition
    topic_archive = _build_topic_archive(100)
    archive_block = ""
    if topic_archive:
        archive_block = (
            "COVERED TOPICS — DO NOT RESEARCH THESE ANGLES AGAIN:\n"
            "These articles have already been published. Find topics that explore DIFFERENT "
            "industries, companies, technologies, or use cases than anything listed below.\n"
            f"{topic_archive}\n\n"
        )

    return Task(
        description=(
            f"Research trending AI, Business, and Finance topics for a {content_type.upper().replace('_', ' ')} article.\n\n"
            f"{archive_block}"
            f"{topic_directive}"
            f"{memory_block}"
            f"TODAY'S CONTENT TYPE: {content_type.upper().replace('_', ' ')}\n"
            f"{content_guidance}\n\n"
            "THEME PREFERENCE: 70% of topics should be business-themed (enterprise AI, productivity, "
            "company strategy) and 30% finance-themed (banking, trading, compliance, capital markets).\n\n"
            "Steps:\n"
            f"{base_steps}\n\n"
            "Output format — JSON array of 8-10 objects, each with:\n"
            "{\n"
            '  "title": "Short topic name",\n'
            '  "summary": "2-3 sentence context paragraph",\n'
            '  "angle": "Specific business/finance angle to write from",\n'
            f'  "content_type": "{content_type}",\n'
            '  "source_urls": ["url1", "url2"],\n'
            '  "recency_hours": 24\n'
            "}\n\n"
            "Return only the JSON array. No prose before or after."
        ),
        expected_output=(
            "A JSON array of 8-10 topic objects, each with title, summary, angle, "
            "content_type, source_urls, and recency_hours fields."
        ),
        agent=agent,
    )
