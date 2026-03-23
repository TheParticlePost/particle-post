from pathlib import Path
from crewai import Agent, LLM
from pipeline.tools.tavily_search import TavilySearchTool

_BACKSTORY = (Path(__file__).parents[1] / "prompts" / "writer_backstory.txt").read_text()


def build_writer() -> Agent:
    return Agent(
        role="Staff Writer",
        goal=(
            "Write a complete, publication-ready article draft at the assigned funnel stage "
            "(TOF: awareness/myth-busting 600-1000 words; MOF: deep analysis 1800-3000 words; "
            "BOF: implementation guide 1200-2000 words). "
            "Follow all mandatory sections for the funnel type. "
            "Include internal links to related published content to guide readers down the funnel."
        ),
        backstory=_BACKSTORY,
        tools=[TavilySearchTool()],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=5000),
        verbose=True,
        allow_delegation=False,
    )
