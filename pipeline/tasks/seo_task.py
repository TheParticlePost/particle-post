from crewai import Task, Agent


def build_seo_task(agent: Agent, editing_task: Task, selection_task: Task) -> Task:
    return Task(
        description=(
            "Produce the complete SEO package for the article as valid JSON.\n\n"
            "Requirements:\n"
            "- primary_keyword: 2-4 words, high intent, what the target reader would search\n"
            "- secondary_keywords: list of 5 related terms\n"
            "- meta_title: under 60 characters, primary keyword near the front\n"
            "- meta_description: under 155 characters, includes a benefit, creates curiosity\n"
            "- slug: 3-6 words, lowercase, hyphens, keyword-rich (e.g. 'ai-fraud-detection-banks')\n"
            "- tags: 3-6 items (broad topic tags readers might follow)\n"
            "- categories: 1-2 items (primary category like 'AI in Finance')\n\n"
            "You may use tavily_search to validate keyword relevance if needed.\n\n"
            "Output only valid JSON — no markdown, no prose, no code fences:\n"
            "{\n"
            '  "primary_keyword": "...",\n'
            '  "secondary_keywords": ["...", "...", "...", "...", "..."],\n'
            '  "meta_title": "...",\n'
            '  "meta_description": "...",\n'
            '  "slug": "...",\n'
            '  "tags": ["...", "...", "..."],\n'
            '  "categories": ["..."]\n'
            "}"
        ),
        expected_output=(
            "A valid JSON object with primary_keyword, secondary_keywords, meta_title, "
            "meta_description, slug, tags, and categories."
        ),
        agent=agent,
        context=[editing_task, selection_task],
    )
