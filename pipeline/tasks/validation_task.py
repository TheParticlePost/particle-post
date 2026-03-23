from crewai import Task, Agent


def build_validation_task(
    agent: Agent,
    formatting_task: Task,
    seo_task: Task,
    selection_task: Task,
) -> Task:
    """
    Build the Production Director's validation task.

    Context provided:
    - formatting_task: the complete Hugo .md article
    - seo_task: SEO package JSON with primary_keyword and meta_description
    - selection_task: original topic JSON with source_urls

    The director evaluates the article against the editorial guidelines loaded
    in its backstory, scores it, and always writes coaching notes for the writer.
    """
    return Task(
        description=(
            "Audit the completed Particle Post article before publication.\n\n"
            "You have access to:\n"
            "  • The complete formatted .md article (from the Formatter)\n"
            "  • The SEO package JSON with primary_keyword and meta_description (from SEO Strategist)\n"
            "  • The original topic selection JSON with source_urls (from Topic Selector)\n\n"

            "═══ PART 1: EVALUATION ═══\n\n"

            "Apply the following 7-point checklist. Start at 100 and deduct points for each failure.\n\n"

            "1. WORD COUNT — Count words in the article body only (exclude the YAML frontmatter "
            "between the --- delimiters at the top). Minimum 700 words required.\n"
            "   Penalty if below: −20 points\n\n"

            "2. FRONTMATTER COMPLETENESS — All of the following must be present and non-empty in the "
            "YAML frontmatter: title, date, slug, description, categories, cover.image\n"
            "   Penalty if any missing: −20 points\n\n"

            "3. COVER IMAGE — The cover.image URL must NOT contain 'picsum.photos'. "
            "A picsum URL means the photo agent failed to find a real image.\n"
            "   Penalty if picsum found: −15 points\n\n"

            "4. SOURCE ATTRIBUTION — The article body must contain at least 3 inline source "
            "citations using phrases like 'according to [Source]', 'per [Source]', "
            "'[Source] reported', 'data from [Source]', or '[Source] found that'.\n"
            "   Penalty if fewer than 3: −20 points\n\n"

            "5. AI-TELL PHRASES — Search the article body for any of these words: "
            "delve, game-changing, transformative, groundbreaking, unprecedented, utilize, seamlessly.\n"
            "   Penalty: −10 per phrase found, maximum −20 points total\n\n"

            "6. ARTICLE STRUCTURE — The article body must contain at least 2 H2 headings "
            "(lines beginning with '## ').\n"
            "   Penalty if fewer than 2: −10 points\n\n"

            "7. LEDE QUALITY — Read the first 1-2 sentences of the article body (after the "
            "frontmatter). The lede must name a specific company, person, dollar amount, or date. "
            "Vague openers like 'In recent years,', 'Many companies are', 'As AI continues to', "
            "'Artificial intelligence is changing' are unacceptable.\n"
            "   Penalty for vague lede: −15 points\n\n"

            "DECISION RULE: If final score ≥ 65 → APPROVE. If below 65 → REJECT.\n\n"

            "IMPORTANT: You are an editorial coach, not a nitpick machine. Use the tavily_search "
            "tool to spot-check 1-2 source URLs from the topic selection — just search for the "
            "article topic and verify the cited publication is real. Add a WARNING (not a penalty) "
            "if a source appears questionable. Do not fail articles on minor imperfections.\n\n"

            "═══ PART 2: COACHING NOTES ═══\n\n"

            "Regardless of your decision, write 2-3 specific coaching notes for the writer. "
            "These are stored and the writer reads them on the NEXT article to improve over time.\n\n"

            "Good coaching notes:\n"
            "  ✓ 'Paragraph 3 claims AI adoption is up 40% but does not cite a source — always "
            "     attribute every statistic to its publisher'\n"
            "  ✓ 'The lede buries the most compelling fact (the Goldman Sachs figure) in paragraph 4 "
            "     — lead with your strongest data point'\n"
            "  ✓ 'Good structure and attribution overall. Vary sentence length more — "
            "     three consecutive sentences of 25+ words slow the reader down'\n\n"

            "Bad coaching notes (too vague):\n"
            "  ✗ 'Add more sources'\n"
            "  ✗ 'The lede could be better'\n"
            "  ✗ 'Good article'\n\n"

            "═══ REQUIRED OUTPUT FORMAT ═══\n\n"

            "Output ONLY the following JSON — no prose before or after it, no markdown code fences:\n\n"
            "{\n"
            '  "decision": "APPROVE" or "REJECT",\n'
            '  "score": <integer 0-100>,\n'
            '  "issues": ["<specific description of each deduction — empty list if none>"],\n'
            '  "coaching_notes": ["<specific note 1>", "<specific note 2>", "<optional note 3>"]\n'
            "}\n\n"

            "Do NOT embed the article content in your output. "
            "Issue descriptions must be specific enough for a writer to fix without re-reading "
            "the article (e.g. 'Banned phrase \"utilize\" appears in the third paragraph' "
            "not 'banned phrase found')."
        ),
        expected_output=(
            "A single JSON object with: decision (APPROVE or REJECT), score (0-100), "
            "issues (list of specific deduction descriptions, empty if none), and "
            "coaching_notes (2-3 specific, actionable notes for the writer). "
            "No article content embedded. No prose outside the JSON."
        ),
        agent=agent,
        context=[formatting_task, seo_task, selection_task],
    )
