from crewai import Task, Agent


def build_validation_task(
    agent: Agent,
    formatting_task: Task,
    seo_gso_task: Task,
    selection_task: Task,
) -> Task:
    """
    Build the Production Director's validation task.

    Context provided:
    - formatting_task: the complete Hugo .md article
    - seo_gso_task: SEO/GSO package JSON with primary_keyword, meta_description, has_faq, faq_questions
    - selection_task: original topic JSON including funnel_type and source_urls
    """
    return Task(
        description=(
            "Audit the completed Particle Post article before publication.\n\n"
            "You have access to:\n"
            "  • The complete formatted .md article (from the Formatter)\n"
            "  • The SEO/GSO package JSON with primary_keyword, meta_description, has_faq (from SEO/GSO Specialist)\n"
            "  • The original topic selection JSON with funnel_type and source_urls (from Topic Selector)\n\n"

            "═══ PART 1: EVALUATION ═══\n\n"

            "Apply the following 10-point checklist. Start at 100 and deduct points for each failure.\n\n"

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

            "9. ANSWER-FIRST STRUCTURE — Check the first H2 section body:\n"
            "   The paragraph immediately after the first ## heading must be a direct "
            "declarative answer (40-60 words). Deduct 5 pts if the first H2 body starts "
            "with a question, a transition phrase ('In today's...', 'As we explore...'), "
            "or a generic setup paragraph rather than a direct answer.\n"
            "   Penalty: −5 points\n\n"

            "10. FAQ SECTION — Only check if has_faq=true in the SEO/GSO package:\n"
            "    If has_faq is true, the article must contain a '## Frequently Asked Questions' "
            "section with at least 3 Q+A pairs (formatted as '### Q:' headers or similar).\n"
            "    Penalty if has_faq=true but FAQ section is missing or has fewer than 3 pairs: −5 points\n"
            "    If has_faq=false or not set, skip this check (no penalty).\n\n"

            "11. H2 QUALITY — Read each ## heading in the article.\n"
            "    Flag any H2 that is generic: 'Background', 'Analysis', 'Discussion', 'Overview', "
            "'Key Developments', 'Market Analysis', 'Introduction', 'Context', 'Summary'.\n"
            "    Each H2 should be specific enough to understand the section without reading the body.\n"
            "    A good H2 names an entity, number, or action: 'Apple's $3.4B AI Chip Investment Reshapes Supply Chain'\n"
            "    Penalty for 2+ generic H2s: −10 points\n\n"

            "12. VISUAL DIVERSITY — Check for visual elements:\n"
            "    - At least 1 stat-box shortcode ({{< stat-box ... >}} or STAT: marker)\n"
            "    - At least 1 blockquote (> **Key Takeaway:** or similar callout)\n"
            "    For MOF/BOF articles (check funnel_type from selection JSON): require at least 2 stat-boxes.\n"
            "    Penalty for missing visual elements: −5 points\n\n"

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
            "  ✓ 'No internal links to related content — add at least 2 links pointing down the funnel'\n"
            "  ✓ 'First H2 starts with a question instead of a direct answer — GSO answer-first structure required'\n\n"

            "═══ REQUIRED OUTPUT FORMAT ═══\n\n"

            "CRITICAL: The VERY FIRST CHARACTER of your response must be '{'. "
            "Do ALL analysis internally (in your head). "
            "Do NOT write any prose, commentary, or step-by-step notes before the JSON.\n\n"

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
        context=[formatting_task, seo_gso_task, selection_task],
    )
