import json
from datetime import datetime, timezone
from pathlib import Path

from crewai import Crew, Process

from pipeline.agents.researcher import build_researcher
from pipeline.agents.topic_selector import build_topic_selector
from pipeline.agents.writer import build_writer
from pipeline.agents.editor import build_editor
from pipeline.agents.seo_gso_specialist import build_seo_gso_specialist
from pipeline.agents.photo_finder import build_photo_finder
from pipeline.agents.production_director import build_production_director

from pipeline.tasks.research_task import build_research_task
from pipeline.tasks.selection_task import build_selection_task, _get_schedule_info
from pipeline.tasks.writing_task import build_writing_task
from pipeline.tasks.seo_gso_task import build_seo_gso_task
from pipeline.tasks.editing_task import build_editing_task
from pipeline.tasks.photo_task import build_photo_task
from pipeline.tasks.validation_task import build_validation_task


def build_research_crew(slot: str, topic_override: str | None = None) -> tuple[Crew, str, str]:
    """
    Build the Research crew (Phase 1) — Haiku only, runs ONCE.

    2 agents: Researcher → Topic Selector
    Returns: (crew, funnel_type, content_type)
    """
    funnel_type, content_type = _get_schedule_info(slot)
    print(f"\n  [Research Crew] Funnel type for {slot}: {funnel_type} | Content type: {content_type}")

    researcher     = build_researcher()
    topic_selector = build_topic_selector()

    research_task  = build_research_task(researcher, content_type=content_type, topic_override=topic_override)
    selection_task = build_selection_task(topic_selector, research_task, slot, topic_override=topic_override)

    crew = Crew(
        agents=[researcher, topic_selector],
        tasks=[research_task, selection_task],
        process=Process.sequential,
        verbose=True,
    )

    return crew, funnel_type, content_type


def build_production_crew(slot: str, funnel_type: str = "TOF", content_type: str = "news_analysis") -> Crew:
    """
    Build the Production crew (Phase 2) — Sonnet + Haiku, retried on rejection.

    4 agents: Writer → Editor → SEO/GSO → Photo
    The Formatter has been replaced by a deterministic Python assembler (article_assembler.py).
    The Production Director runs as a separate step after assembly.

    Topic info comes via kickoff inputs: {topic_json}, {funnel_type}, {content_type}, {rejection_feedback}

    Task indices for run.py:
      [0] writing_task
      [1] editing_task
      [2] seo_gso_task     ← run.py reads SEO JSON from here
      [3] photo_task
    """
    print(f"\n  [Production Crew] Building for {slot} slot, funnel: {funnel_type}")

    # --- Agents ---
    writer             = build_writer()
    editor             = build_editor()
    seo_gso_specialist = build_seo_gso_specialist()
    photo_finder       = build_photo_finder()

    # --- Tasks (Writer → Editor → SEO/GSO → Photo) ---
    writing_task = build_writing_task(writer, funnel_type, content_type)
    editing_task = build_editing_task(editor, writing_task)
    seo_gso_task = build_seo_gso_task(seo_gso_specialist, editing_task)
    photo_task   = build_photo_task(photo_finder, seo_gso_task)

    return Crew(
        agents=[
            writer,
            editor,
            seo_gso_specialist,
            photo_finder,
        ],
        tasks=[
            writing_task,
            editing_task,
            seo_gso_task,
            photo_task,
        ],
        process=Process.sequential,
        verbose=True,
    )


def build_director_crew() -> Crew:
    """
    Build a standalone 1-agent crew for the Production Director.

    Called after the Python assembler produces the final article.
    The assembled article is passed via {assembled_article} kickoff input.
    """
    director = build_production_director()
    validation_task = build_validation_task(director, formatting_task=None)

    return Crew(
        agents=[director],
        tasks=[validation_task],
        process=Process.sequential,
        verbose=True,
    )


# --- Backward compatibility (deprecated) ---
def build_crew(slot: str, topic_override: str | None = None) -> Crew:
    """DEPRECATED: Use build_research_crew() + build_production_crew() instead."""
    print("  [WARN] build_crew() is deprecated. Use the 2-crew split instead.")
    # Fall back to old behavior for any external callers
    research_crew, funnel_type, content_type = build_research_crew(slot, topic_override)
    return research_crew  # Only returns research crew — callers must be updated
