from crewai import Task, Agent


def build_validation_task(
    agent: Agent,
    formatting_task: Task | None = None,
) -> Task:
    """
    Build the Production Director's validation task.

    When called from the pipeline, the assembled article content is passed
    via the {assembled_article} kickoff input. The formatting_task parameter
    is kept for backward compatibility but is no longer used.

    SEO metadata (has_faq, schema_type, primary_keyword) is read from the YAML frontmatter.
    Funnel type is provided via the {funnel_type} kickoff input.
    """
    context = [formatting_task] if formatting_task else []

    return Task(
        description=(
            "Audit the completed Particle Post article before publication.\n\n"
            "You have access to:\n"
            "  • The complete assembled .md article with YAML frontmatter:\n"
            "{assembled_article}\n\n"
            "  • The funnel type: {funnel_type}\n\n"

            "Read SEO metadata directly from the YAML frontmatter:\n"
            "  • has_faq: true/false (look for 'has_faq:' in the frontmatter)\n"
            "  • schema_type: (look for 'schema_type:' in the frontmatter)\n"
            "  • primary keyword: infer from the 'title:' and 'keywords:' fields\n\n"

            "═══ PART 1: EVALUATION ═══\n\n"

            "Apply the following checklist. Start at 100 and deduct points for each failure.\n\n"

            "1. WORD COUNT — Count words in the article body only (exclude YAML frontmatter). "
            "Check the funnel_type AND the content_type (look for 'content_type:' in frontmatter):\n"
            "   TOF: minimum 600, maximum 1000 words\n"
            "   MOF (default): minimum 1800, maximum 3000 words\n"
            "   BOF (default): minimum 1200, maximum 2000 words\n"
            "   case_study (overrides MOF/BOF): minimum 1500, maximum 2500 words\n"
            "   deep_dive (overrides MOF): minimum 2500, maximum 4000 words\n"
            "   Penalty if below minimum OR above maximum: -20 points\n"
            "   ALSO CHECK: The formatter must output exactly ONE version of the article. "
            "If you see duplicate content (two versions stacked), that is an automatic -20.\n\n"

            "2. FRONTMATTER COMPLETENESS — All of the following must be present and non-empty: "
            "title, date, slug, description, categories, cover.image\n"
            "   Penalty if any missing: −20 points\n\n"

            "3. COVER IMAGE — The cover.image URL must NOT contain 'picsum.photos'.\n"
            "   Penalty if picsum found: −25 points\n\n"

            "4. SOURCE ATTRIBUTION — At least 3 inline citations: "
            "'according to [Source]', 'per [Source]', '[Source] reported', etc.\n"
            "   Penalty if fewer than 3: −20 points\n\n"

            "5. AI-TELL PHRASES — Search for: delve, game-changing, transformative, groundbreaking, "
            "unprecedented, utilize, seamlessly, furthermore, moreover, needless to say, rest assured.\n"
            "   Penalty: −10 per phrase found, maximum −20 points total\n\n"

            "13. EM-DASH BAN — The article must contain ZERO em-dash characters (\u2014).\n"
            "    Search the entire article body AND frontmatter for the \u2014 character.\n"
            "    Penalty: −15 points per em-dash found, maximum −30 points\n\n"

            "14. SEO KEYWORD IN H1 — The YAML title (H1) should contain a relevant keyword "
            "related to the article topic. Check the 'keywords:' list in frontmatter for reference.\n"
            "    Penalty if title is too generic or contains no keyword: -15 points\n\n"

            "15. GSO QUESTION H2s — At least 2 H2 headings should be phrased as questions "
            "containing a long-tail keyword, followed by a direct declarative answer paragraph.\n"
            "    Penalty if fewer than 2 question H2s with answer-first paragraphs: -10 points\n\n"

            "6. ARTICLE STRUCTURE — Must contain at least 2 H2 headings (lines beginning '## ').\n"
            "   Penalty if fewer than 2: -10 points\n\n"

            "7. LEDE QUALITY — First 1-2 sentences must name a specific company, person, "
            "dollar amount, or date. Vague openers are unacceptable.\n"
            "   Penalty for vague lede: −15 points\n\n"

            "8. FUNNEL TYPE COMPLIANCE — Funnel type: {funnel_type}\n"
            "   TOF: H1 should be a question. Include a 'Clear Verdict' section. "
            "At least 1 internal markdown link.\n"
            "   MOF: Address what research proves AND what it does NOT prove. "
            "Name at least 2 real-world friction scenarios. At least 2 internal links.\n"
            "   BOF: Include numbered implementation steps. "
            "Name at least 2 failure scenarios. Go/no-go decision checkpoint. "
            "At least 1 internal link.\n"
            "   Penalty for missing funnel structure: −10 points\n\n"

            "9. ANSWER-FIRST STRUCTURE — The paragraph after the first ## heading must be a direct "
            "declarative answer (40-60 words).\n"
            "   Penalty: −5 points\n\n"

            "10. FAQ SECTION — Check 'has_faq:' in YAML frontmatter:\n"
            "    If has_faq is true, the article must contain a '## Frequently Asked Questions' "
            "section with at least 3 Q+A pairs.\n"
            "    If has_faq is false or not set, skip this check.\n"
            "    Penalty if has_faq=true but FAQ missing or < 3 pairs: −5 points\n\n"

            "11. H2 QUALITY — Flag any H2 that is generic: 'Background', 'Analysis', 'Discussion', "
            "'Overview', 'Key Developments', 'Introduction', 'Context', 'Summary'.\n"
            "    Penalty for 2+ generic H2s: −10 points\n\n"

            "12. VISUAL DIVERSITY — Check for visual elements:\n"
            "    - At least 1 stat-box shortcode or STAT: marker\n"
            "    - At least 1 blockquote callout\n"
            "    For MOF/BOF (funnel_type: {funnel_type}): require at least 2 stat-boxes.\n"
            "    For case_study / deep_dive: require at least 3 stat-boxes.\n"
            "    Penalty for missing visual elements: −5 points\n\n"

            "16. LIMITATIONS SECTION (case_study + deep_dive only) — Check content_type. "
            "If 'case_study' or 'deep_dive', the article MUST contain one of: "
            "'## Limitations', '## What the Data Doesn't Show', '## Caveats', "
            "'### Limitations', '### What We Don't Know'.\n"
            "    Penalty if missing for case_study/deep_dive: −15 points\n\n"

            "17. CITATION DENSITY (case_study + deep_dive only) — Scan each paragraph "
            "that contains a percentage, dollar amount, or numeric claim. Each such "
            "paragraph must include a citation phrase within 2 sentences of the number "
            "(publication name, institution, filing type, or URL).\n"
            "    Penalty: −10 points if more than 2 numeric claims are orphaned\n\n"

            "18. PRIMARY SOURCE USAGE (case_study + deep_dive only) — Check the article "
            "body for references to primary sources: '10-K', '10-Q', '8-K', 'SEC EDGAR', "
            "'annual report', 'earnings call', 'investor relations', 'IR page', 'FY2024', "
            "'FY2025', 'FY2026', 'fiscal year', 'proxy statement', or explicit filing dates.\n"
            "    Penalty: −10 points if zero primary-source references in a case_study or deep_dive\n\n"

            "DECISION RULE: If final score ≥ 65 → APPROVE. If below 65 → REJECT.\n\n"

            "MANDATORY: Use tavily_search to verify at least 2 source URLs from the article's "
            "Sources section. Search for the claim + source name to confirm the citation is real. "
            "If a source cannot be verified, add a WARNING in the issues list (not a score deduction) "
            "with the specific URL and claim that could not be confirmed.\n\n"
            "You are an editorial coach, not a nitpick machine. Most articles with good content "
            "and proper sources should score 80+. Reject only articles that would embarrass the publication.\n\n"

            "═══ PART 2: COACHING NOTES ═══\n\n"

            "Regardless of your decision, write 2-3 specific coaching notes for the writer.\n\n"

            "═══ REQUIRED OUTPUT FORMAT ═══\n\n"

            "CRITICAL: The VERY FIRST CHARACTER of your response must be '{'. "
            "Do ALL analysis internally. No prose before or after the JSON.\n\n"

            "Output ONLY:\n"
            "{\n"
            '  "decision": "APPROVE" or "REJECT",\n'
            '  "score": <integer 0-100>,\n'
            '  "issues": ["<specific description of each deduction>"],\n'
            '  "coaching_notes": ["<note 1>", "<note 2>", "<optional note 3>"]\n'
            "}\n\n"

            "Do NOT embed the article content in your output."
        ),
        expected_output=(
            "A single JSON object with: decision (APPROVE or REJECT), score (0-100), "
            "issues (list of specific deduction descriptions, empty if none), and "
            "coaching_notes (2-3 specific, actionable notes). "
            "No article content embedded. No prose outside the JSON."
        ),
        agent=agent,
        context=context,
    )
