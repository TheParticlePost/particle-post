import json
from datetime import datetime, timezone
from pathlib import Path

from crewai import Crew, Process

from pipeline.agents.researcher import build_researcher
from pipeline.agents.topic_selector import build_topic_selector
from pipeline.agents.writer import build_writer
from pipeline.agents.editor import build_editor
from pipeline.agents.seo_optimizer import build_seo_optimizer
from pipeline.agents.photo_finder import build_photo_finder
from pipeline.agents.formatter import build_formatter
from pipeline.agents.production_director import build_production_director

from pipeline.tasks.research_task import build_research_task
from pipeline.tasks.selection_task import build_selection_task, _get_funnel_type
from pipeline.tasks.writing_task import build_writing_task
from pipeline.tasks.editing_task import build_editing_task
from pipeline.tasks.seo_task import build_seo_task
from pipeline.tasks.photo_task import build_photo_task
from pipeline.tasks.formatting_task import build_formatting_task
from pipeline.tasks.validation_task import build_validation_task


def build_crew(slot: str) -> Crew:
    """
    Build the Particle Post publishing crew for a given slot.

    8 sequential agents:
      0  Researcher       → research_task
      1  Topic Selector   → selection_task   (outputs funnel_type in JSON)
      2  Writer           → writing_task     (funnel-specific requirements injected)
      3  Editor           → editing_task
      4  SEO Optimizer    → seo_task
      5  Photo Finder     → photo_task
      6  Formatter        → formatting_task  ← run.py reads tasks_output[-2].raw
      7  Prod. Director   → validation_task  ← run.py reads tasks_output[-1].raw (verdict JSON)

    Funnel type (TOF/MOF/BOF) is determined from content_strategy.json schedule
    at crew build time and injected into selection and writing tasks.
    """
    # Determine funnel type for this slot from the schedule
    funnel_type = _get_funnel_type(slot)
    print(f"\n  [Crew] Funnel type for {slot} slot: {funnel_type}")

    # --- Agents ---
    researcher          = build_researcher()
    topic_selector      = build_topic_selector()
    writer              = build_writer()
    editor              = build_editor()
    seo_optimizer       = build_seo_optimizer()
    photo_finder        = build_photo_finder()
    formatter           = build_formatter()
    production_director = build_production_director()

    # --- Tasks (order matters — sequential process) ---
    research_task   = build_research_task(researcher)
    selection_task  = build_selection_task(topic_selector, research_task, slot)
    writing_task    = build_writing_task(writer, selection_task, funnel_type)
    editing_task    = build_editing_task(editor, writing_task)
    seo_task        = build_seo_task(seo_optimizer, editing_task, selection_task)
    photo_task      = build_photo_task(photo_finder, editing_task, seo_task)
    formatting_task = build_formatting_task(
        formatter, editing_task, seo_task, photo_task, selection_task
    )
    validation_task = build_validation_task(
        production_director, formatting_task, seo_task, selection_task
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
            production_director,
        ],
        tasks=[
            research_task,
            selection_task,
            writing_task,
            editing_task,
            seo_task,
            photo_task,
            formatting_task,   # index -2 — formatter output accessed by run.py
            validation_task,   # index -1 — director verdict in result.tasks_output[-1]
        ],
        process=Process.sequential,
        verbose=True,
    )
