from datetime import datetime, timezone

from crewai import Agent, Task


def build_marketing_analysis_task(agent: Agent) -> Task:
    """
    Build the Marketing Director's daily analysis task.

    The agent collects performance data, evaluates strategy, and outputs
    a single JSON object that marketing_run.py parses to update all config files.
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

            "═══ STEP 5: OUTPUT JSON ═══\n\n"

            "Output ONLY this JSON object — no prose before or after, no markdown code fences:\n\n"
            "{\n"
            '  "decision": "KEEP" | "ADJUST" | "NEW",\n'
            '  "rationale": "2-3 sentence explanation — be specific about the data that drove the decision",\n'
            '  "strategy_update": {\n'
            '    "content_pillar_focus": "e.g. AI in Finance Operations",\n'
            '    "target_keywords": ["keyword1", "...", "up to 8 max"],\n'
            '    "long_tail_keywords": ["phrase 1", "...", "up to 6 max"],\n'
            f'    "evaluation_date": "YYYY-MM-DD (7 days from {today})",\n'
            '    "description": "One sentence describing what this plan is doing"\n'
            "  },\n"
            '  "seo_guidelines": "FULL MARKDOWN for seo_guidelines.md — all 10 sections above",\n'
            '  "update_editorial_guidelines": false,\n'
            '  "editorial_guidelines": null,\n'
            '  "daily_report": "FULL MARKDOWN for the daily log — all sections above"\n'
            "}\n\n"

            "IMPORTANT NOTES:\n"
            "  • Set update_editorial_guidelines to true ONLY if you are making a NEW plan "
            "    that requires significantly different editorial direction\n"
            "  • If update_editorial_guidelines is true, provide the full replacement content "
            "    in editorial_guidelines (otherwise leave null)\n"
            "  • The seo_guidelines and daily_report fields must contain the FULL markdown text — "
            "    do not truncate or summarize them\n"
            "  • Escape any double quotes inside the JSON string values with a backslash"
        ),
        expected_output=(
            "A single JSON object with: decision (KEEP/ADJUST/NEW), rationale, strategy_update "
            "(keywords and pillar focus), seo_guidelines (full markdown), "
            "update_editorial_guidelines (bool), editorial_guidelines (markdown or null), "
            "and daily_report (full markdown). No prose outside the JSON."
        ),
        agent=agent,
    )
