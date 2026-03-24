from datetime import datetime, timezone

from crewai import Agent, Task


def build_seo_noon_task(agent: Agent, marketing_task: Task) -> Task:
    """
    SEO/GSO Specialist noon collaboration task.

    Runs in marketing_run.py immediately after the Marketing Director.
    Reads the MD's analysis and ===GSO_HANDOFF=== section, validates keyword
    opportunities, and outputs updated GSO directives to seo_gso_config.json.

    On the 1st of each month: also runs an AI citation audit via tavily_search.
    """
    today       = datetime.now(timezone.utc)
    date_str    = today.strftime("%Y-%m-%d")
    is_audit_day = today.day == 1

    audit_instruction = ""
    if is_audit_day:
        audit_instruction = (
            "\nMONTHLY AI CITATION AUDIT (today is the 1st — run this):\n"
            "Use tavily_search to check if theparticlepost.com appears in results for our "
            "top 3-5 keywords. Search each keyword as a question (e.g. 'What is AI fraud detection?') "
            "and note whether our articles are cited. Record found citations in the audit section.\n"
        )

    return Task(
        description=(
            f"Perform the SEO/GSO noon collaboration for {date_str}.\n\n"

            "═══ STEP 1: READ MARKETING DIRECTOR OUTPUT ═══\n\n"

            "Read the Marketing Director's analysis from the marketing_task context. "
            "Find the ===GSO_HANDOFF=== section — it contains:\n"
            "  • top_keyword_opportunities (from GSC + Trends)\n"
            "  • content_gap_priorities (specific article ideas not yet covered)\n"
            "  • trending_angles (today's trending topics)\n"
            "  • avoid_cannibalization (slugs of similar existing posts)\n"
            "  • schema_priority (recommended schema type this week)\n\n"

            "═══ STEP 2: VALIDATE KEYWORD OPPORTUNITIES ═══\n\n"

            "Pick the 2 most promising keyword opportunities from the handoff. "
            "Use tavily_search to spot-check: search each keyword and verify that "
            "the search volume seems real and competitors are actually ranking for it. "
            "Adjust the final list based on what you find.\n\n"

            + audit_instruction +

            "═══ STEP 3: OUTPUT GSO DIRECTIVES ═══\n\n"

            "Output a JSON object between ===GSO_DIRECTIVES=== and ===END_GSO_DIRECTIVES=== markers. "
            "This JSON will be merged into seo_gso_config.json by marketing_run.py.\n\n"

            "===GSO_DIRECTIVES===\n"
            "{\n"
            f'  "last_updated": "{date_str}",\n'
            '  "keyword_targets": ["validated keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],\n'
            '  "content_gap_priorities": ["gap topic 1", "gap topic 2", "gap topic 3"],\n'
            '  "schema_priority": "FAQPage",\n'
            '  "avoid_cannibalization": ["slug-1", "slug-2"],\n'
            '  "ai_citation_audit": null\n'
            "}\n"
            "===END_GSO_DIRECTIVES===\n\n"

            "RULES:\n"
            "  • keyword_targets must be validated (not just copied from handoff — spot-check at least 2)\n"
            "  • schema_priority: 'FAQPage' for informational keywords, 'HowTo' for step-by-step, 'Article' otherwise\n"
            "  • ai_citation_audit: null on non-1st-of-month days; on audit days use this structure:\n"
            '    {"last_audit_date": "YYYY-MM-DD", "perplexity_citations": ["slug1"], '
            '"chatgpt_citations": [], "google_aio_citations": [], "notes": "..."}\n'
            "  • Output ONLY the ===GSO_DIRECTIVES=== block — no other prose"
        ),
        expected_output=(
            "A ===GSO_DIRECTIVES===...===END_GSO_DIRECTIVES=== block containing a valid JSON object "
            "with keyword_targets (5 validated keywords), content_gap_priorities (3 topics), "
            "schema_priority, avoid_cannibalization slugs, and ai_citation_audit (null or audit data). "
            "No other prose."
        ),
        agent=agent,
        context=[marketing_task],
    )
