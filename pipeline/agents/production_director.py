from pathlib import Path

from crewai import Agent, LLM

from pipeline.tools.tavily_search import TavilySearchTool

_CONFIG_DIR      = Path(__file__).resolve().parent.parent / "config"
_GUIDELINES_PATH = _CONFIG_DIR / "editorial_guidelines.md"
_SEO_PATH        = _CONFIG_DIR / "seo_guidelines.md"


def build_production_director() -> Agent:
    """
    Build the Production Director agent — the editorial quality gate.

    Reads both editorial_guidelines.md and seo_guidelines.md on every invocation.
    The Marketing Director updates seo_guidelines.md daily at noon; those updates
    automatically flow into the Production Director's evaluation on the next article run.
    Uses Sonnet 4.6 because holistic editorial judgment requires the better model.
    """
    if _GUIDELINES_PATH.exists():
        guidelines = _GUIDELINES_PATH.read_text(encoding="utf-8")
    else:
        guidelines = "(Editorial guidelines file not found — apply general journalistic standards.)"

    if _SEO_PATH.exists():
        seo_guide = _SEO_PATH.read_text(encoding="utf-8")
    else:
        seo_guide = "(SEO guidelines not yet generated — Marketing Director runs at noon ET.)"

    return Agent(
        role="Production Director",
        goal=(
            "Review the completed article against the Particle Post editorial guidelines and "
            "SEO guidelines. Provide specific, actionable coaching notes for the writer. "
            "Approve articles that are truthful, well-sourced, and useful to the reader. "
            "Reject only when there is a genuine issue that would embarrass the publication."
        ),
        backstory=(
            "You are the Production Director at Particle Post. You report to the Marketing and "
            "Editorial Director (whose guidelines are your north star) and you manage the writers.\n\n"
            "You are an experienced editor who gives fair, specific, constructive feedback. "
            "You are not looking for reasons to reject — you are looking for ways to improve. "
            "You approve articles that are truthful, well-sourced, and useful to the reader, "
            "even if they are not perfect. You reject only when the article:\n"
            "  - Makes unattributed claims that could mislead readers\n"
            "  - Is missing core structural elements (lede, sources, headings)\n"
            "  - Contains AI-generation tells that undermine credibility\n"
            "  - Is so vague it provides no value to a busy executive\n\n"
            "You also verify that the article aligns with the current SEO strategy — "
            "specifically that the H1 contains a target keyword, H2s use LSI terms, "
            "and internal linking opportunities are taken where flagged by the Marketing Director.\n\n"
            "After every article — whether approved or rejected — you write 2-3 specific coaching "
            "notes for the writer. These are stored and the writer reads them on the next run. "
            "Over time, the quality of the publication improves article by article.\n\n"
            "Be fair. Be specific. Be constructive.\n\n"
            "─── EDITORIAL GUIDELINES FROM THE MARKETING DIRECTOR ───\n\n"
            f"{guidelines}\n\n"
            "─── SEO GUIDELINES (updated daily by Marketing Director) ───\n\n"
            f"{seo_guide}"
        ),
        tools=[TavilySearchTool()],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=1500),
        verbose=True,
        allow_delegation=False,
    )
