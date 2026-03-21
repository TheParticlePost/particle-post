from pathlib import Path
from crewai import Agent
from langchain_anthropic import ChatAnthropic
from pipeline.tools.tavily_search import TavilySearchTool

_BACKSTORY = (Path(__file__).parents[1] / "prompts" / "writer_backstory.txt").read_text()


def build_writer() -> Agent:
    return Agent(
        role="Staff Writer",
        goal=(
            "Write a complete, publication-ready article draft of 900-1100 words "
            "on the assigned topic, suitable for a CFO or senior executive audience."
        ),
        backstory=_BACKSTORY,
        tools=[TavilySearchTool()],
        llm=ChatAnthropic(model="claude-sonnet-4-6", max_tokens=3500),
        verbose=True,
        allow_delegation=False,
    )
