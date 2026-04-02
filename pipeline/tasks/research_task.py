import json
from pathlib import Path
from crewai import Task
from crewai import Agent

HISTORY_FILE = Path(__file__).parents[2] / "blog" / "data" / "topics_history.json"


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


def build_research_task(agent: Agent, content_type: str = "news", topic_override: str | None = None) -> Task:
    # Base search queries for all runs
    base_steps = (
        "1. Use google_trends tool to get current US trending topics.\n"
        "2. Use newsapi_fetch with query 'artificial intelligence business finance' "
        "to get recent headlines.\n"
        "3. Use tavily_search with 'AI business news today' and 'fintech AI trends this week'.\n"
    )

    # Add practical-content-specific searches when scheduled
    if content_type == "practical":
        extra_steps = (
            "4. Use tavily_search with 'AI implementation case study business 2026' "
            "to find real-world deployment stories with measurable outcomes.\n"
            "5. Use tavily_search with 'how to use AI tools productivity business' "
            "to find actionable how-to content for executives.\n"
            "6. Use tavily_search with 'AI tool comparison enterprise 2026' "
            "to find side-by-side product evaluations.\n"
            "7. Synthesize findings into a structured briefing.\n\n"
        )
        content_guidance = (
            "IMPORTANT: Today's content type is PRACTICAL. Include at least 4 practical topics "
            "(how-to guides, case studies, tool comparisons) alongside 4 news topics. "
            "Practical topics should name specific tools, companies, or methodologies. "
            "Examples of good practical angles:\n"
            "  - 'How [Company] cut costs 30% using [AI tool] — step-by-step'\n"
            "  - '[Tool A] vs [Tool B] for enterprise finance teams'\n"
            "  - 'Step-by-step: deploying AI agents for accounts payable'\n\n"
        )
    else:
        extra_steps = "4. Synthesize findings into a structured briefing.\n\n"
        content_guidance = (
            "Today's content type is NEWS. Focus on breaking developments with clear "
            "business implications. Each topic must answer: 'What should a CEO/CFO do with this?'\n\n"
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
            "Research trending AI, Business, and Finance topics from the last 24 hours.\n\n"
            f"{archive_block}"
            f"{topic_directive}"
            f"{content_guidance}"
            "THEME PREFERENCE: 70% of topics should be business-themed (enterprise AI, productivity, "
            "company strategy) and 30% finance-themed (banking, trading, compliance, capital markets).\n\n"
            "Steps:\n"
            f"{base_steps}"
            f"{extra_steps}"
            "Output format — JSON array of 8-10 objects, each with:\n"
            "{\n"
            '  "title": "Short topic name",\n'
            '  "summary": "2-3 sentence context paragraph",\n'
            '  "angle": "Specific business/finance angle to write from",\n'
            '  "content_type": "practical" or "news",\n'
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
