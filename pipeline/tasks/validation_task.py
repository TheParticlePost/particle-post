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
    - selection_task: original topic JSON including funnel_type and source_urls
    """
    return Task(
        description=(
            "Audit the completed Particle Post article before publication.\n\n"
            "You have access to:\n"
            "  • The complete formatted .md article (from the Formatter)\n"
            "  • The SEO package JSON with primary_keyword and meta_description (from SEO Strategist)\n"
            "  • The original topic selection JSON with funnel_type and source_urls (from Topic Selector)\n\n"

            "═══ PART 1: EVALUATION ═══\n\n"

            "Apply the following 8-point checklist. Start at 100 and deduct points for each failure.\n\n"

            "1. WORD COUNT — Count words in the article body only (exclude YAML frontmatter). "
            "Check the funnel_type from the selection JSON:\n"
            "   TOF: minimum 600 words | MOF: minimum 1800 words | BOF: minimum 1200 words\n"
            "   Also flag if TOF exceeds 1000 words (too long for awareness stage).\n"
            "   Penalty if below minimum: −20 points\n\n"

            "2. FRONTMATTER COMPLETENESS — All of the following must be present and non-empty: "
            "title, date, slug, description, categories, cover.image\n"
            "   Penalty if any missing: −20 points\n\n"

            "3. COVER IMAGE — The cover.image URL must NOT contain 'picsum.photos'.\n"
            "   Penalty if picsum found: −15 points\n\n"

            "4. SOURCE ATTRIBUTION — At least 3 inline citations: "
            "'according to [Source]', 'per [Source]', '[Source] reported', etc.\n"
            "   Penalty if fewer than 3: −20 points\n\n"

            "5. AI-TELL PHRASES — Search for: delve, game-changing, transformative, groundbreaking, "
            "unprecedented, utilize, seamlessly, furthermore, moreover, em dash used more than once "
            "per paragraph (— used repeatedly), needless to say, rest assured.\n"
            "   Penalty: −10 per phrase found, maximum −20 points total\n\n"

            "6. ARTICLE STRUCTURE — Must contain at least 2 H2 headings (lines beginning '## ').\n"
            "   Penalty if fewer than 2: −10 points\n\n"

            "7. LEDE QUALITY — First 1-2 sentences must name a specific company, person, "
            "dollar amount, or date. Vague openers are unacceptable.\n"
            "   Penalty for vague lede: −15 points\n\n"

            "8. FUNNEL TYPE COMPLIANCE — Check the funnel_type from the selection JSON:\n"
            "   TOF: H1 should be a question ('Does...?', 'Can...?', 'Should...?', 'Is...?'). "
            "Article should include a 'Clear Verdict' section. "
            "Should contain at least 1 internal markdown link pointing to deeper content.\n"
            "   MOF: Article should address what research proves AND what it does NOT prove. "
            "Should name at least 2 real-world friction scenarios. "
            "Should contain at least 2 internal markdown links.\n"
            "   BOF: Article should include numbered implementation steps. "
            "Should name at least 2 failure scenarios. "
            "Should contain a go/no-go decision checkpoint section. "
            "Should contain at least 1 internal markdown link.\n"
            "   Penalty for missing funnel structure: −10 points\n\n"

            "DECISION RULE: If final score ≥ 65 → APPROVE. If below 65 → REJECT.\n\n"

            "IMPORTANT: You are an editorial coach, not a nitpick machine. Use tavily_search "
            "to spot-check 1-2 source URLs from the topic selection. Add a WARNING (not a penalty) "
            "if a source appears questionable. Do not fail articles on minor imperfections.\n\n"

            "═══ PART 2: COACHING NOTES ═══\n\n"

            "Regardless of your decision, write 2-3 specific coaching notes for the writer. "
            "Include at least one note about funnel type compliance if relevant.\n\n"

            "Good coaching notes:\n"
            "  ✓ 'This is a TOF article but runs 1,400 words — TOF should be 600-1000 for scannability'\n"
            "  ✓ 'MOF article is missing the \"What the Study Does NOT Prove\" section — this is mandatory'\n"
            "  ✓ 'BOF article has no go/no-go decision checkpoint — readers need explicit criteria'\n"
            "  ✓ 'No internal links to related content — add at least 2 links pointing down the funnel'\n\n"

            "═══ REQUIRED OUTPUT FORMAT ═══\n\n"

            "Output ONLY the following JSON — no prose before or after it, no markdown code fences:\n\n"
            "{\n"
            '  "decision": "APPROVE" or "REJECT",\n'
            '  "score": <integer 0-100>,\n'
            '  "issues": ["<specific description of each deduction — empty list if none>"],\n'
            '  "coaching_notes": ["<specific note 1>", "<specific note 2>", "<optional note 3>"]\n'
            "}\n\n"

            "Do NOT embed the article content in your output. "
            "Issue descriptions must be specific enough for a writer to fix without re-reading the article."
        ),
        expected_output=(
            "A single JSON object with: decision (APPROVE or REJECT), score (0-100), "
            "issues (list of specific deduction descriptions, empty if none), and "
            "coaching_notes (2-3 specific, actionable notes). "
            "No article content embedded. No prose outside the JSON."
        ),
        agent=agent,
        context=[formatting_task, seo_task, selection_task],
    )
