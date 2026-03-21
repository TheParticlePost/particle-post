from pathlib import Path
from crewai import Agent, LLM

_BACKSTORY = (Path(__file__).parents[1] / "prompts" / "editor_backstory.txt").read_text()


def build_editor() -> Agent:
    return Agent(
        role="Editor",
        goal=(
            "Review and improve the article draft for quality, accuracy, tone, "
            "and adherence to the Particle Post style guide. Return the improved "
            "article followed by a brief edit log."
        ),
        backstory=_BACKSTORY,
        tools=[],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=4000),
        verbose=True,
        allow_delegation=False,
    )
