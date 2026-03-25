from crewai import Task
from crewai import Agent


def build_research_task(agent: Agent, content_type: str = "news") -> Task:
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

    return Task(
        description=(
            "Research trending AI, Business, and Finance topics from the last 24 hours.\n\n"
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
