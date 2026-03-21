from crewai import Task, Agent


def build_writing_task(agent: Agent, selection_task: Task) -> Task:
    return Task(
        description=(
            "Write a complete article based on the selected topic.\n\n"
            "Requirements:\n"
            "- Length: 900-1100 words\n"
            "- Audience: C-suite executives, senior analysts, institutional investors\n"
            "- Tone: Authoritative, direct, data-driven — like Bloomberg or The Economist\n"
            "- Structure:\n"
            "  1. Hook lede (2 sentences max — make a busy executive want to keep reading)\n"
            "  2. Context paragraph (why this matters now)\n"
            "  3. 3-4 body sections with H2 headings\n"
            "  4. A 'Key Takeaway' callout (write it as: KEY TAKEAWAY: [insight])\n"
            "  5. Forward-looking conclusion\n"
            "  6. Sources list at the bottom\n\n"
            "- Include at least 2 concrete examples with named companies or real figures\n"
            "- Every statistic must cite a source inline: 'according to [Source]'\n"
            "- No rhetorical questions\n"
            "- No passive voice\n"
            "- No AI clichés: no 'delve', 'game-changing', 'transformative', 'landscape'\n\n"
            "You may use the tavily_search tool to verify specific facts or find additional data.\n\n"
            "Output the raw article text only. No markdown formatting yet (no # headings, "
            "no ** bold). Write sections naturally — the formatter will add markdown later."
        ),
        expected_output=(
            "A complete 900-1100 word article in plain prose with: lede, context, "
            "3-4 body sections labeled with their heading text, a KEY TAKEAWAY line, "
            "a conclusion, and a Sources section with URLs."
        ),
        agent=agent,
        context=[selection_task],
    )
