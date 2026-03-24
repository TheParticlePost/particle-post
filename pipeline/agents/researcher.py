import json
from pathlib import Path
from crewai import Agent, LLM
from pipeline.tools.tavily_search import TavilySearchTool
from pipeline.tools.google_trends import GoogleTrendsTool
from pipeline.tools.newsapi_fetch import NewsApiFetchTool

_BACKSTORY = (Path(__file__).parents[1] / "prompts" / "researcher_backstory.txt").read_text()
_GSO_CONFIG = Path(__file__).parents[1] / "config" / "seo_gso_config.json"


def _load_seo_directives() -> str:
    """Load current SEO keyword targets so research focuses on priority topics."""
    if not _GSO_CONFIG.exists():
        return ""
    try:
        data = json.loads(_GSO_CONFIG.read_text(encoding="utf-8"))
        targets = data.get("keyword_targets", [])
        gaps    = data.get("content_gap_priorities", [])
        avoid   = data.get("avoid_cannibalization", [])
        lines   = []
        if targets:
            lines.append(f"PRIORITY KEYWORD TARGETS THIS WEEK: {', '.join(targets)}")
            lines.append("  → Actively look for breaking news and data on these topics.")
        if gaps:
            lines.append(f"CONTENT GAP PRIORITIES: {', '.join(gaps)}")
            lines.append("  → These topics have search demand but we haven't covered them yet.")
        if avoid:
            lines.append(f"ALREADY COVERED (avoid duplicating): {', '.join(avoid)}")
        return "\n".join(lines) if lines else ""
    except Exception:
        return ""


def build_researcher() -> Agent:
    seo_directives = _load_seo_directives()
    backstory = _BACKSTORY
    if seo_directives:
        backstory += (
            "\n\n━━━ SEO RESEARCH PRIORITIES ━━━\n\n"
            + seo_directives
            + "\n\nFocus your research on these priority areas when relevant trending stories exist. "
            "Do not force topics — only highlight them if real news is breaking."
        )
    return Agent(
        role="Research Scout",
        goal=(
            "Produce a structured briefing of 8-10 trending AI/Business/Finance topics "
            "from the last 24 hours, with context and source URLs for each."
        ),
        backstory=backstory,
        tools=[TavilySearchTool(), GoogleTrendsTool(), NewsApiFetchTool()],
        llm=LLM(model="anthropic/claude-haiku-4-5-20251001", max_tokens=2000),
        verbose=True,
        allow_delegation=False,
    )
