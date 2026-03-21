from pathlib import Path
from crewai import Agent
from langchain_anthropic import ChatAnthropic
from pipeline.tools.tavily_search import TavilySearchTool

_BACKSTORY = (Path(__file__).parents[1] / "prompts" / "seo_backstory.txt").read_text()


def build_seo_optimizer() -> Agent:
    return Agent(
        role="SEO Strategist",
        goal=(
            "Produce the complete SEO package for the article as valid JSON: "
            "primary keyword, secondary keywords, meta title, meta description, "
            "slug, tags, and categories."
        ),
        backstory=_BACKSTORY,
        tools=[TavilySearchTool()],
        llm=ChatAnthropic(model="claude-haiku-4-5-20251001", max_tokens=800),
        verbose=True,
        allow_delegation=False,
    )
