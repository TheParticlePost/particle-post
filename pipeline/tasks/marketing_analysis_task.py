from datetime import datetime, timezone

from crewai import Agent, Task


def build_marketing_analysis_task(agent: Agent) -> Task:
    """
    Build the Marketing Director's daily analysis task.

    The agent collects performance data, evaluates strategy, and outputs
    a structured document with a small JSON block + delimited markdown sections.
    This avoids JSON-escaping failures on large markdown strings.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return Task(
        description=(
            f"Perform the daily Particle Post marketing analysis for {today}.\n\n"

            "═══ STEP 1: COLLECT ALL DATA ═══\n\n"

            "Call each tool in this exact order (do not skip any):\n"
            "1. ga4_analytics('7d')         — last 7 days traffic\n"
            "2. ga4_analytics('30d')        — last 30 days traffic for trend context\n"
            "3. search_console('top_queries')   — top clicked search queries\n"
            "4. search_console('opportunities') — ranking 5-20, 50+ impressions: highest-value targets\n"
            "5. search_console('top_pages')     — top clicked pages\n"
            "6. google_trends                   — trending AI/finance topics right now\n"
            "7. tavily_search('AI finance blog content strategy 2026') — competitor intel\n\n"

            "If any tool returns '[Not configured]', note it and continue — use available data.\n\n"

            "═══ STEP 2: EVALUATE CURRENT STRATEGY ═══\n\n"

            "Using the data collected and the current strategy in your context:\n\n"
            "A. PERFORMANCE CHECK\n"
            "   - Are sessions trending up vs the baseline?\n"
            "   - Are any of our target keywords appearing in GSC top_queries?\n"
            "   - What is the avg position for our target keywords? Improving?\n"
            "   - Which articles are getting the most organic traffic?\n\n"

            "B. OPPORTUNITY ANALYSIS\n"
            "   - Which 'opportunities' queries (pos 5-20) match our content but haven't "
            "     been deeply covered? These are the best quick-win keyword targets.\n"
            "   - Which Google Trends topics align with our content pillars?\n"
            "   - What content gaps exist vs competitors (from Tavily research)?\n"
            "   - Which recent articles should cross-link to each other? (Look at slugs)\n\n"

            "C. STRATEGY DECISION\n"
            "   Apply these rules strictly:\n"
            "   - KEEP  if: plan is < 5 days old OR metrics are improving OR no clear better path\n"
            "   - ADJUST if: 1-2 specific keyword targets should change, or pillar weighting shifts\n"
            "   - NEW   if: 7+ days with flat/declining metrics AND a clearly better opportunity exists\n\n"

            "═══ STEP 3: WRITE SEO GUIDELINES ═══\n\n"

            "Write the FULL content of the new seo_guidelines.md file. It must include:\n\n"
            "1. CURRENT STRATEGY SUMMARY — one line, what we're focused on and why\n\n"
            "2. PRIMARY TARGET KEYWORDS (5-8 keywords)\n"
            "   — Based on GSC opportunities, Trends data, and current strategy\n"
            "   — At least one must be included in every article H1\n\n"
            "3. LONG-TAIL KEYWORDS (4-6 phrases, 4+ words each)\n"
            "   — From GSC opportunity queries that match our content\n"
            "   — Include year (2026) in time-sensitive ones\n\n"
            "4. H1 PATTERN\n"
            "   — Exact formula with example: [Keyword]: [Named Company/Figure/Number + Context]\n"
            "   — Max 70 chars for SERP display. Include year when relevant.\n\n"
            "5. H2 PATTERNS (2-3 templates)\n"
            "   — LSI keyword patterns\n"
            "   — Question format for featured snippet potential\n"
            "   — Named entity format (e.g. 'The JPMorgan Approach to...')\n\n"
            "6. H3 GUIDANCE\n"
            "   — Long-tail specific, company/method/metric named\n\n"
            "7. META DESCRIPTION PATTERN\n"
            "   — Formula: keyword in first 60 chars + data point + reader benefit\n"
            "   — Max 155 chars\n\n"
            "8. INTERNAL LINKING OPPORTUNITIES\n"
            "   — Based on recent articles in context: name specific article slugs and "
            "     which keywords to use as anchor text when cross-linking\n"
            "   — Example: 'When discussing AI fraud detection, link to [slug] using "
            "     anchor text \"AI fraud detection in banking\"'\n\n"
            "9. CONTENT GAPS (3-5 priority topics)\n"
            "   — Specific article ideas based on opportunity keywords not yet covered\n\n"
            "10. CONTENT PILLAR FOCUS\n"
            "    — Which pillar to emphasize this week and why\n\n"

            "═══ STEP 4: WRITE DAILY REPORT ═══\n\n"

            "Write the full content of the daily markdown report for the owner.\n"
            "Include:\n"
            "  - Traffic summary (key numbers from GA4)\n"
            "  - Top performing articles this week\n"
            "  - Keyword ranking highlights (any entering top 10?)\n"
            "  - Strategy decision and rationale\n"
            "  - Top 3 action items for the content team\n"
            "  - What to watch this week\n\n"

            "═══ STEP 5: UI DIRECTIVES ANALYSIS (CONDITIONAL) ═══\n\n"

            "Review the GA4 engagement metrics collected in Step 1:\n\n"
            "THRESHOLDS THAT TRIGGER UI DIRECTIVES:\n"
            "  • avg_session_duration < 60s  → readability or layout problem\n"
            "  • bounce_rate > 75%           → hero section or CTA problem\n"
            "  • pages_per_session < 1.5     → navigation or related-content problem\n\n"
            "RULES:\n"
            "  1. Only generate directives if AT LEAST ONE threshold is breached\n"
            "  2. Check the UI Experiment History in your context — do NOT target any "
            "     component/property changed within the last 7 days (7-day cooldown)\n"
            "  3. If metrics are healthy, data is too sparse (< 50 sessions), or all relevant "
            "     components are in cooldown — set ui_directives to null\n"
            "  4. Maximum 2 directives per day (keep changes small and measurable)\n\n"
            "TARGETABLE COMPONENTS:\n"
            "  post-card  : property '--gap' (current: 24px), 'card-image-height' (196px), "
            "'border-radius' (12px)\n"
            "  hero       : property 'cta-text', 'stats-labels', 'subtitle-text', 'badge-text'\n"
            "  navigation : property 'subscribe-button-size'\n"
            "  footer     : property 'tagline-text'\n"
            "  typography : property 'body-font-size' (range: 0.95rem–1.1rem), "
            "'line-height' (range: 1.7–1.9)\n\n"
            "If generating directives, use this exact structure for each directive:\n"
            '  {"component": "post-card", "change_type": "css_var", '
            '"property": "--gap", "rationale": "bounce rate 82% exceeds 75% threshold — '
            'more whitespace reduces cognitive load"}\n\n'

            "═══ STEP 6: CONTENT STRATEGY EVOLUTION (OPTIONAL) ═══\n\n"

            "Review the current content_strategy.json (your context includes the funnel schedule, "
            "word counts, and distribution). You may propose 1-2 small changes if data clearly supports it.\n\n"

            "RULES FOR PROPOSING CHANGES:\n"
            "  1. Maximum 2 changes per run\n"
            "  2. Only propose if GA4/GSC data clearly shows a specific metric problem tied to the strategy\n"
            "  3. Never change mandatory_sections, internal_linking_strategy.goal, or ai_tells_to_avoid\n"
            "  4. Wait at least 7 days between changes to the same field\n"
            "  5. If metrics are healthy or data is sparse (< 100 sessions), set strategy_changes to []\n\n"

            "EXAMPLES OF VALID CHANGES:\n"
            "  - Adjust schedule (e.g., move BOF from Sunday to Saturday if Sunday shows low session duration)\n"
            "  - Adjust word count targets within the funnel type ranges\n"
            "  - Update tone guidance for a specific funnel type\n\n"

            "EXAMPLES OF INVALID CHANGES:\n"
            "  - Removing mandatory sections from any funnel type\n"
            "  - Changing internal linking minimums to 0\n"
            "  - Changing ai_tells_to_avoid list\n\n"

            "═══ STEP 7: OUTPUT ═══\n\n"

            "Output the following four blocks IN ORDER, with NO prose between them.\n\n"

            "─── BLOCK 1: JSON (small — no markdown inside) ───\n\n"
            "Output this JSON object first. All values must be simple strings, numbers, "
            "booleans, arrays, or null — NO multiline text, NO markdown:\n\n"
            "{\n"
            '  "decision": "KEEP" | "ADJUST" | "NEW",\n'
            '  "rationale": "2-3 sentence explanation — specific data that drove the decision",\n'
            '  "strategy_update": {\n'
            '    "content_pillar_focus": "e.g. AI in Finance Operations",\n'
            '    "target_keywords": ["keyword1", "up to 8 max"],\n'
            '    "long_tail_keywords": ["phrase 1", "up to 6 max"],\n'
            f'    "evaluation_date": "YYYY-MM-DD (7 days from {today})",\n'
            '    "description": "One sentence describing what this plan is doing"\n'
            "  },\n"
            '  "update_editorial_guidelines": false,\n'
            '  "ui_directives": null,\n'
            '  "strategy_changes": []\n'
            "}\n\n"
            "If strategy changes were warranted (Step 6), replace strategy_changes [] with:\n"
            '  "strategy_changes": [\n'
            '    {\n'
            '      "field_path": "schedule.Sunday.morning",\n'
            '      "old_value": "MOF",\n'
            '      "new_value": "TOF",\n'
            '      "rationale": "Sunday morning GA4 data shows avg session duration 35s — awareness content performs better",\n'
            '      "metric_to_watch": "avg_session_duration",\n'
            '      "rollback_trigger": "avg_session_duration drops >10% over 14 days"\n'
            '    }\n'
            '  ]\n\n'
            "If UI directives were warranted (Step 5), replace ui_directives null with:\n"
            '  "ui_directives": {\n'
            '    "trigger_metric": "avg_session_duration",\n'
            '    "trigger_value": "45s (below 60s threshold)",\n'
            '    "target_metric": "avg_session_duration",\n'
            '    "directives": [{"component": "...", "change_type": "css_var", '
            '"property": "...", "rationale": "..."}],\n'
            '    "constraints": ["do not change brand colors", "maintain dark mode compatibility"],\n'
            '    "evaluation_period_days": 7\n'
            "  }\n\n"

            "─── BLOCK 2: SEO GUIDELINES ───\n\n"
            "Output this exact delimiter on its own line, then the full markdown:\n\n"
            "===SEO_GUIDELINES===\n"
            "(full markdown content of seo_guidelines.md — all 10 sections from Step 3)\n\n"

            "─── BLOCK 3: DAILY REPORT ───\n\n"
            "Output this exact delimiter on its own line, then the full markdown:\n\n"
            "===DAILY_REPORT===\n"
            "(full markdown content of the daily report — all sections from Step 4)\n\n"

            "─── BLOCK 4: EDITORIAL GUIDELINES (conditional) ───\n\n"
            "Only include this block if update_editorial_guidelines is true in Block 1.\n"
            "Output this exact delimiter on its own line, then the full replacement markdown:\n\n"
            "===EDITORIAL_GUIDELINES===\n"
            "(full replacement content for editorial_guidelines.md)\n\n"

            "RULES:\n"
            "  • Block 1 JSON must be valid — no prose before it, no markdown code fences\n"
            "  • The === delimiters must be on their own line with nothing else on that line\n"
            "  • Do not truncate the SEO guidelines or daily report — write them in full\n"
            "  • ui_directives must be null unless a metric threshold was clearly breached"
        ),
        expected_output=(
            "Block 1: valid JSON (decision, rationale, strategy_update, update_editorial_guidelines, "
            "ui_directives, strategy_changes). "
            "Block 2: ===SEO_GUIDELINES=== delimiter followed by full seo_guidelines.md markdown. "
            "Block 3: ===DAILY_REPORT=== delimiter followed by full daily report markdown. "
            "Block 4 (optional): ===EDITORIAL_GUIDELINES=== delimiter followed by full editorial "
            "guidelines markdown. No prose between blocks."
        ),
        agent=agent,
    )
