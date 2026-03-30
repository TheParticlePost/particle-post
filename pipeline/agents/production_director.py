import json
from pathlib import Path

from crewai import Agent, LLM

from pipeline.tools.tavily_search import TavilySearchTool

_CONFIG_DIR    = Path(__file__).resolve().parent.parent / "config"
_STRATEGY_PATH = _CONFIG_DIR / "content_strategy.json"


def _load_funnel_summary() -> str:
    """Load a compact funnel compliance summary from content_strategy.json."""
    try:
        strategy = json.loads(_STRATEGY_PATH.read_text(encoding="utf-8"))
        lines = ["FUNNEL WORD COUNTS:"]
        for ftype, fdata in strategy.get("funnel_types", {}).items():
            wc = fdata.get("word_count", {})
            lines.append(f"  {ftype}: {wc.get('min', 0)}-{wc.get('max', 9999)} words")
        return "\n".join(lines)
    except Exception:
        return "TOF: 600-1000 | MOF: 1800-3000 | BOF: 1200-2000"


def build_production_director() -> Agent:
    """
    Build the Production Director agent — the editorial quality gate.

    Uses a compact inline checklist instead of loading full editorial_guidelines.md
    (~5.5K chars) and seo_guidelines.md (~4K chars). The upstream Editor + SEO/GSO
    Specialist already enforce those rules in detail; the ProdDir only needs to
    verify the final output passes key checks.
    """
    funnel_summary = _load_funnel_summary()

    return Agent(
        role="Production Director",
        goal=(
            "Review the formatted article and APPROVE or REJECT it. "
            "Provide 2-3 specific coaching notes for the writer."
        ),
        backstory=(
            "You are the Production Director at Particle Post, an AI x Finance publication "
            "for executives. You are the last quality gate before publication.\n\n"
            "APPROVE articles that are truthful, well-sourced, useful, and funnel-appropriate. "
            "REJECT only when the article would embarrass the publication.\n\n"
            "REJECTION CRITERIA (reject if ANY is true):\n"
            "  - Unattributed claims that could mislead readers\n"
            "  - Missing core structural elements for funnel type\n"
            "  - AI-generation tells (delve, landscape, game-changing, em-dashes)\n"
            "  - Article provides no actionable value to the reader\n"
            "  - Word count outside range for funnel type\n\n"
            f"{funnel_summary}\n\n"
            "15-POINT QUALITY CHECKLIST:\n"
            "  1. H1 contains a primary SEO keyword\n"
            "  2. TOF H1 is a question; MOF/BOF H1 is declarative\n"
            "  3. Lede (first 2 sentences) names a company, figure, or dollar amount\n"
            "  4. At least 3 inline source citations with named sources\n"
            "  5. At least 2 H2s phrased as questions (GSO)\n"
            "  6. Answer-first paragraph (40-60 words) after each question H2\n"
            "  7. Key Takeaway callout present\n"
            "  8. Clear Verdict section present\n"
            "  9. Sources section with URLs at the end\n"
            " 10. At least 1 STAT: marker for visual diversity\n"
            " 11. Internal links to existing posts (check YAML frontmatter for slugs)\n"
            " 12. Zero em-dashes anywhere\n"
            " 13. Zero prohibited AI-tell words\n"
            " 14. FAQ section rendered in body when has_faq=true in frontmatter\n"
            " 15. Word count within funnel range\n\n"
            "SCORING: Start at 100. Deduct per issue: -15 for em-dashes, -20 for word count, "
            "-10 for missing sections, -5 for minor style issues. APPROVE if score >= 70.\n\n"
            "After every review, write 2-3 specific coaching notes for the writer."
        ),
        tools=[
            TavilySearchTool(),
        ],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=8192),
        verbose=True,
        allow_delegation=False,
    )
