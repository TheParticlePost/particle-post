import json
from pathlib import Path

from crewai import Agent, LLM
from pipeline.tools.tavily_search import TavilySearchTool

_BACKSTORY_PATH = Path(__file__).parents[1] / "prompts" / "seo_gso_backstory.txt"
_CONFIG_PATH    = Path(__file__).parents[1] / "config" / "seo_gso_config.json"


def _load_gso_state() -> str:
    """Load current GSO directives from seo_gso_config.json for agent context."""
    if not _CONFIG_PATH.exists():
        return "(No GSO directives yet — first run.)"
    try:
        data = json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
        lines = []

        keyword_targets = data.get("keyword_targets", [])
        if keyword_targets:
            lines.append(f"KEYWORD TARGETS THIS WEEK: {', '.join(keyword_targets)}")

        gaps = data.get("content_gap_priorities", [])
        if gaps:
            lines.append(f"CONTENT GAP PRIORITIES: {', '.join(gaps)}")

        avoid = data.get("avoid_cannibalization", [])
        if avoid:
            lines.append(f"AVOID CANNIBALIZATION (these slugs already cover these topics): {', '.join(avoid)}")

        schema_priority = data.get("schema_priority", "FAQPage")
        lines.append(f"SCHEMA PRIORITY: {schema_priority}")

        coverage = data.get("schema_coverage", {})
        if any(coverage.values()):
            coverage_str = " | ".join(f"{k}:{v}" for k, v in coverage.items() if v)
            lines.append(f"SCHEMA COVERAGE TO DATE: {coverage_str}")

        audit = data.get("ai_citation_audit", {})
        if audit.get("last_audit_date"):
            perp_count = len(audit.get("perplexity_citations", []))
            lines.append(f"LAST AI CITATION AUDIT: {audit['last_audit_date']} — {perp_count} Perplexity citations found")

        if not lines:
            return "(GSO config exists but no directives set yet.)"
        return "\n".join(lines)
    except Exception as exc:
        return f"(Could not load GSO state: {exc})"


def build_seo_gso_specialist() -> Agent:
    """
    Build the SEO/GSO Specialist agent.

    Dual use:
      1. Article production crew (crew.py): restructures Writer's V1 + generates SEO package
      2. Marketing noon crew (marketing_run.py): collaborates with MD to update GSO directives

    Uses claude-sonnet-4-6 — requires strong reasoning for both content restructuring
    and keyword strategy work.
    """
    backstory = _BACKSTORY_PATH.read_text(encoding="utf-8")
    gso_state  = _load_gso_state()

    # Inline self-audit replaces the on_page_seo_audit and geo_content_optimizer skill tools.
    # These were separate Haiku API calls (~500K tokens each). Now the agent does the same
    # checks in a single pass using its own Sonnet context.
    self_audit = (
        "\n\n━━━ SELF-AUDIT CHECKLIST (run mentally before outputting) ━━━\n\n"
        "ON-PAGE SEO AUDIT:\n"
        "  [ ] Meta title: primary keyword in first 5 words, under 60 chars\n"
        "  [ ] Meta description: keyword in first 60 chars, under 155 chars, contains data point\n"
        "  [ ] Slug: 3-6 words, lowercase hyphens, keyword-rich\n"
        "  [ ] H1 contains primary keyword (exact or close variant)\n"
        "  [ ] Heading hierarchy: H1 > H2 > H3, no skipped levels\n"
        "  [ ] Primary keyword appears 2-4x naturally in body (not stuffed)\n"
        "  [ ] Schema type matches content (FAQPage if has_faq=true)\n"
        "  [ ] Internal links use keyword-rich anchor text, not 'click here'\n\n"
        "AI SEARCH OPTIMIZATION (CITE framework):\n"
        "  [ ] Credibility: named sources, dates, dollar amounts in every section\n"
        "  [ ] Informativeness: answer-first paragraph after each H2 (40-60 words)\n"
        "  [ ] Timeliness: recent data (within 90 days preferred), dates stated explicitly\n"
        "  [ ] Engagement: FAQ section with self-contained answers under 50 words each\n"
        "  [ ] Sub-queries: 2-4 AI sub-query angles explicitly addressed\n"
        "  [ ] Entity density: specific companies, people, percentages throughout\n"
    )

    return Agent(
        role="SEO/GSO Specialist",
        goal=(
            "Restructure the Writer's draft for maximum GSO impact and produce "
            "the complete SEO package as structured output. During noon sessions, "
            "collaborate with the Marketing Director to set keyword targets and GSO directives."
        ),
        backstory=(
            backstory
            + "\n\n━━━ CURRENT GSO DIRECTIVES ━━━\n\n"
            + gso_state
            + self_audit
        ),
        tools=[
            TavilySearchTool(),
        ],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=8192),
        verbose=True,
        allow_delegation=False,
    )
