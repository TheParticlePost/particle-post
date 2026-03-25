import json
from pathlib import Path

from crewai import Agent, LLM
from pipeline.tools.tavily_search import TavilySearchTool

_BACKSTORY_PATH = Path(__file__).parents[1] / "prompts" / "seo_gso_backstory.txt"
_CONFIG_PATH    = Path(__file__).parents[1] / "config" / "seo_gso_config.json"
_POST_INDEX     = Path(__file__).parents[1] / "config" / "post_index.json"


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


def _load_post_index() -> str:
    """Load compact post index for internal link targeting."""
    if not _POST_INDEX.exists():
        return "(No post index yet.)"
    try:
        data  = json.loads(_POST_INDEX.read_text(encoding="utf-8"))
        posts = data.get("posts", [])[:30]
        if not posts:
            return "(No posts indexed yet.)"
        lines = ["POST INDEX (for internal_link_targets — use exact slugs):"]
        for p in posts:
            lines.append(
                f"  {p.get('slug', '')} | {p.get('title', '')} | {p.get('funnel_type', '')} | {p.get('date', '')}"
            )
        return "\n".join(lines)
    except Exception as exc:
        return f"(Could not load post index: {exc})"


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
    post_index = _load_post_index()

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
            + "\n\n━━━ POST INDEX ━━━\n\n"
            + post_index
        ),
        tools=[TavilySearchTool()],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=4000),
        verbose=True,
        allow_delegation=False,
    )
