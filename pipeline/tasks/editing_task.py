from crewai import Task, Agent


def build_editing_task(agent: Agent, writing_task: Task) -> Task:
    return Task(
        description=(
            "Edit and improve the article draft. Apply the full Particle Post style guide:\n\n"
            "1. Remove all AI-tell phrases: delve, it's worth noting, game-changing, "
            "transformative, landscape, groundbreaking, revolutionary, unprecedented, "
            "robust, leverage (metaphorical), utilize, facilitate, seamlessly.\n"
            "2. Rewrite any sentence over 35 words.\n"
            "3. Convert passive voice to active voice.\n"
            "4. Remove all rhetorical questions — state the answer instead.\n"
            "5. Ensure Oxford comma is used throughout.\n"
            "6. Fix number formatting: one through nine spelled out, 10+ as numerals.\n"
            "7. Ensure every statistic has a named source inline.\n"
            "8. Check logical flow — each paragraph must follow from the previous.\n"
            "9. Verify the lede (first 2 sentences) would hook a busy executive.\n"
            "10. Remove any repeated ideas — keep only the best instance.\n\n"
            "Output format:\n"
            "[REVISED ARTICLE]\n"
            "(full revised article text)\n\n"
            "[EDIT LOG]\n"
            "- Change 1: description\n"
            "- Change 2: description\n"
            "(3-5 bullet points)\n\n"
            "PREVIOUS REJECTION FEEDBACK (blank on first run — if present, the Production Director "
            "found specific issues. Address all of them before returning the revised article):\n"
            "{rejection_feedback}"
        ),
        expected_output=(
            "The revised article text under [REVISED ARTICLE], followed by "
            "3-5 bullet points under [EDIT LOG] describing what was changed and why."
        ),
        agent=agent,
        context=[writing_task],
    )
