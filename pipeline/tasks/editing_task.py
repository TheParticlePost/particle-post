from crewai import Task, Agent


def build_editing_task(agent: Agent, writing_task: Task) -> Task:
    context = [writing_task]

    return Task(
        description=(
            "Edit and improve the Writer's V1 article draft. "
            "Read the article from the Writer's output. "
            "Apply funnel-specific editing rules for funnel type: {funnel_type}\n"
            "(TOF: keep concise 600-1000 words; MOF: ensure depth 1800-3000 words; BOF: verify steps 1200-2000 words).\n\n"
            "Apply the full Particle Post style guide:\n\n"
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
            "10. Remove any repeated ideas, keep only the best instance.\n"
            "11. EM-DASH BAN (CRITICAL, #1 cause of rejection): Search your ENTIRE revised article for "
            "the em-dash character (\u2014). Replace EVERY instance with a comma, colon, semicolon, or period. "
            "Also replace en-dashes (\u2013) and double-hyphens (--) used as punctuation. "
            "ZERO em-dashes allowed. Do a final character-by-character scan before outputting.\n\n"
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
        context=context,
    )
