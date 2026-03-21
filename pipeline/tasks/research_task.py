from crewai import Task
from crewai import Agent


def build_research_task(agent: Agent) -> Task:
    return Task(
        description=(
            "Research trending AI, Business, and Finance topics from the last 24 hours.\n\n"
            "Steps:\n"
            "1. Use google_trends tool to get current US trending topics.\n"
            "2. Use newsapi_fetch with query 'artificial intelligence business finance' "
            "to get recent headlines.\n"
            "3. Use tavily_search with 'AI business news today' and 'fintech AI trends this week'.\n"
            "4. Synthesize findings into a structured briefing.\n\n"
            "Output format — JSON array of 8-10 objects, each with:\n"
            "{\n"
            '  "title": "Short topic name",\n'
            '  "summary": "2-3 sentence context paragraph",\n'
            '  "angle": "Specific business/finance angle to write from",\n'
            '  "source_urls": ["url1", "url2"],\n'
            '  "recency_hours": 24\n'
            "}\n\n"
            "Return only the JSON array. No prose before or after."
        ),
        expected_output=(
            "A JSON array of 8-10 topic objects, each with title, summary, angle, "
            "source_urls, and recency_hours fields."
        ),
        agent=agent,
    )
