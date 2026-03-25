from crewai import Agent, LLM
from pipeline.tools.file_writer import FileWriterTool


def build_publisher() -> Agent:
    return Agent(
        role="Publisher",
        goal=(
            "Write the formatted markdown post to disk at the correct path "
            "and update the topics history file."
        ),
        backstory=(
            "You are a publishing system operator. You receive the final formatted markdown content "
            "along with metadata (filename, title, slug, tags) and use the file_writer tool to "
            "persist the post to disk. You always construct the input JSON correctly before calling "
            "the tool. You confirm success by reporting the file path written."
        ),
        tools=[FileWriterTool()],
        llm=LLM(model="anthropic/claude-haiku-4-5-20251001", max_tokens=8192),
        verbose=True,
        allow_delegation=False,
    )
