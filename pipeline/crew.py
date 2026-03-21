from crewai import Crew, Process

from pipeline.agents.researcher import build_researcher
from pipeline.agents.topic_selector import build_topic_selector
from pipeline.agents.writer import build_writer
from pipeline.agents.editor import build_editor
from pipeline.agents.seo_optimizer import build_seo_optimizer
from pipeline.agents.photo_finder import build_photo_finder
from pipeline.agents.formatter import build_formatter

from pipeline.tasks.research_task import build_research_task
from pipeline.tasks.selection_task import build_selection_task
from pipeline.tasks.writing_task import build_writing_task
from pipeline.tasks.editing_task import build_editing_task
from pipeline.tasks.seo_task import build_seo_task
from pipeline.tasks.photo_task import build_photo_task
from pipeline.tasks.formatting_task import build_formatting_task


def build_crew(slot: str) -> Crew:
    """
    Build the Particle Post publishing crew for a given slot.
    The crew runs 7 agents sequentially; run.py handles the actual
    file write from the Formatter's output (more reliable than
    passing large markdown strings through tool calls).

    Args:
        slot: "morning" or "evening"

    Returns:
        A configured CrewAI Crew ready to kick off.
    """
    # --- Agents ---
    researcher = build_researcher()
    topic_selector = build_topic_selector()
    writer = build_writer()
    editor = build_editor()
    seo_optimizer = build_seo_optimizer()
    photo_finder = build_photo_finder()
    formatter = build_formatter()

    # --- Tasks (order matters — sequential process) ---
    research_task = build_research_task(researcher)
    selection_task = build_selection_task(topic_selector, research_task, slot)
    writing_task = build_writing_task(writer, selection_task)
    editing_task = build_editing_task(editor, writing_task)
    seo_task = build_seo_task(seo_optimizer, editing_task, selection_task)
    photo_task = build_photo_task(photo_finder, editing_task, seo_task)
    formatting_task = build_formatting_task(
        formatter, editing_task, seo_task, photo_task, selection_task
    )

    return Crew(
        agents=[
            researcher,
            topic_selector,
            writer,
            editor,
            seo_optimizer,
            photo_finder,
            formatter,
        ],
        tasks=[
            research_task,
            selection_task,
            writing_task,
            editing_task,
            seo_task,
            photo_task,
            formatting_task,
        ],
        process=Process.sequential,
        verbose=True,
    )
