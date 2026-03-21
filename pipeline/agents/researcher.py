from pathlib import Path
from crewai import Agent, LLM
from pipeline.tools.tavily_search import TavilySearchTool
from pipeline.tools.google_trends import GoogleTrendsTool
from pipeline.tools.newsapi_fetch import NewsApiFetchTool

_BACKSTORY = (Path(__file__).parents[1] / "prompts" / "researcher_backstory.txt").read_text()


def build_researcher() -> Agent:
    return Agent(
        role="Research Scout",
        goal=(
            "Produce a structured briefing of 8-10 trending AI/Business/Finance topics "
            "from the last 24 hours, with context and source URLs for each."
        ),
        backstory=_BACKSTORY,
        tools=[TavilySearchTool(), GoogleTrendsTool(), NewsApiFetchTool()],
        llm=LLM(model="anthropic/claude-haiku-4-5-20251001", max_tokens=2000),
        verbose=True,
        allow_delegation=False,
    )
