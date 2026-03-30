#!/usr/bin/env python3
"""
Particle Post — Human-Assisted Pipeline

Skips Researcher and Topic Selector. Human provides topic, sources, and key points.
The pipeline handles writing, SEO, editing, photo, formatting, and validation.
Does NOT auto-commit — the GitHub workflow creates a PR for human review.

Usage:
    python -m pipeline.human_run --slot morning --topic "AI fraud detection" \
        --sources "https://url1.com;https://url2.com" \
        --key-points "Focus on ROI;Compare with manual processes"
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_REPO_ROOT / ".env", override=True)

# Reuse helpers from the main pipeline
from pipeline.run import (
    _check_env,
    _strip_code_fences,
    _sanitize_article,
    _parse_director_verdict,
    _correct_verdict,
    _save_coaching_notes,
    _write_post,
    _parse_seo_json,
    _update_gso_state,
    _generate_llms_txt,
)

MAX_ATTEMPTS = 2  # Fewer retries for human-assisted (human can iterate on PR)


def _build_human_crew(slot: str, topic: str, sources: str, key_points: str):
    """Build a crew that skips Researcher + Topic Selector."""
    from crewai import Crew, Process, Task

    from pipeline.agents.writer import build_writer
    from pipeline.agents.editor import build_editor
    from pipeline.agents.seo_gso_specialist import build_seo_gso_specialist
    from pipeline.agents.photo_finder import build_photo_finder
    from pipeline.agents.formatter import build_formatter
    from pipeline.agents.production_director import build_production_director

    from pipeline.tasks.selection_task import _get_schedule_info
    from pipeline.tasks.writing_task import (
        _load_recent_coaching,
        _load_post_index,
        _load_funnel_requirements,
        _load_seo_guidelines,
    )
    from pipeline.tasks.seo_gso_task import build_seo_gso_task
    from pipeline.tasks.editing_task import build_editing_task
    from pipeline.tasks.photo_task import build_photo_task
    from pipeline.tasks.formatting_task import build_formatting_task
    from pipeline.tasks.validation_task import build_validation_task

    funnel_type, content_type = _get_schedule_info(slot)
    print(f"\n  [Human Crew] Funnel type for {slot} slot: {funnel_type}")

    # Build agents (skip researcher + topic_selector)
    writer = build_writer()
    seo_gso_specialist = build_seo_gso_specialist()
    editor = build_editor()
    photo_finder = build_photo_finder()
    formatter = build_formatter()
    production_director = build_production_director()

    # Build context for writer: inject human-provided topic, sources, key points
    coaching_context = _load_recent_coaching()
    post_index = _load_post_index()
    funnel_reqs = _load_funnel_requirements(funnel_type)
    seo_guidelines = _load_seo_guidelines()

    sources_block = ""
    if sources:
        source_list = [s.strip() for s in sources.split(";") if s.strip()]
        sources_block = (
            "\n══════════════════════════════════════════════\n"
            "  HUMAN-PROVIDED SOURCES (use these as primary references)\n"
            "══════════════════════════════════════════════\n\n"
            + "\n".join(f"  {i+1}. {s}" for i, s in enumerate(source_list))
            + "\n"
        )

    key_points_block = ""
    if key_points:
        kp_list = [k.strip() for k in key_points.split(";") if k.strip()]
        key_points_block = (
            "\n══════════════════════════════════════════════\n"
            "  HUMAN DIRECTION (follow these key points)\n"
            "══════════════════════════════════════════════\n\n"
            + "\n".join(f"  - {k}" for k in kp_list)
            + "\n"
        )

    word_targets = {"TOF": "600-1000", "MOF": "1800-3000", "BOF": "1200-2000"}
    word_range = word_targets.get(funnel_type, "900-1100")

    # Create a mock selection task output as a Task for context
    # This replaces the Researcher + Topic Selector output
    selection_stub = Task(
        description="Return the selected topic as structured JSON.",
        expected_output="JSON with topic, funnel_type, and angle.",
        agent=writer,
    )
    # Pre-populate the selection stub output so downstream tasks can read it
    selection_stub.output = type("Output", (), {
        "raw": json.dumps({
            "topic": topic,
            "funnel_type": funnel_type,
            "angle": key_points.split(";")[0] if key_points else topic,
            "content_type": content_type,
        })
    })()

    writing_task = Task(
        description=(
            f"{coaching_context}"
            f"Write a complete, publication-ready article about: {topic}\n\n"
            f"{sources_block}"
            f"{key_points_block}"
            f"══════════════════════════════════════════════\n"
            f"  FUNNEL TYPE: {funnel_type}\n"
            f"══════════════════════════════════════════════\n\n"
            f"{funnel_reqs}\n\n"
            "══════════════════════════════════════════════\n"
            "  VOICE & STYLE\n"
            "══════════════════════════════════════════════\n\n"
            "- Tone: Bloomberg / Economist: authoritative, direct, data-driven\n"
            "- Every sentence earns its place. Cut anything that does not add information.\n"
            "- Never passive voice when active is available.\n"
            "- Average sentence: 12-16 words. Max sentence: 25 words.\n"
            "- The lede must name a specific company, person, dollar amount, or date.\n"
            "- Every statistic cites a source inline: 'according to [Source]'\n"
            "- At least 3 inline source citations total.\n\n"
            "══════════════════════════════════════════════\n"
            "  INTERNAL LINKING\n"
            "══════════════════════════════════════════════\n\n"
            f"{post_index}\n\n"
            f"{seo_guidelines}"
            "══════════════════════════════════════════════\n"
            "  OUTPUT FORMAT\n"
            "══════════════════════════════════════════════\n\n"
            "Output the raw article text only. No markdown formatting yet.\n"
            "Label each section heading with its text on its own line.\n\n"
            "PREVIOUS REJECTION FEEDBACK:\n{rejection_feedback}"
        ),
        expected_output=(
            f"A complete {word_range} word article in plain prose with: a specific lede, "
            "all mandatory sections, at least 3 inline source citations, "
            "internal links, a Clear Verdict section, and a Sources section with URLs."
        ),
        agent=writer,
    )

    seo_gso_task = build_seo_gso_task(seo_gso_specialist, writing_task)
    editing_task = build_editing_task(editor, seo_gso_task)
    photo_task = build_photo_task(photo_finder, editing_task)
    formatting_task = build_formatting_task(
        formatter, editing_task, seo_gso_task, photo_task
    )
    validation_task = build_validation_task(
        production_director, formatting_task
    )

    return Crew(
        agents=[
            writer,
            seo_gso_specialist,
            editor,
            photo_finder,
            formatter,
            production_director,
        ],
        tasks=[
            writing_task,      # index 0
            seo_gso_task,      # index 1
            editing_task,      # index 2
            photo_task,        # index 3
            formatting_task,   # index -2
            validation_task,   # index -1
        ],
        process=Process.sequential,
        verbose=True,
    ), funnel_type


def main():
    parser = argparse.ArgumentParser(description="Human-Assisted Post Pipeline")
    parser.add_argument("--slot", required=True, choices=["morning", "evening"])
    parser.add_argument("--topic", required=True, help="Article topic / direction")
    parser.add_argument("--sources", default="", help="Source URLs (semicolon-separated)")
    parser.add_argument("--key-points", default="", help="Key points (semicolon-separated)")
    args = parser.parse_args()

    missing = _check_env()
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — HUMAN-ASSISTED PIPELINE")
    print(f"  Topic: {args.topic}")
    print(f"  Slot: {args.slot}")
    if args.sources:
        print(f"  Sources: {args.sources[:80]}...")
    if args.key_points:
        print(f"  Key Points: {args.key_points[:80]}...")
    print(f"{'='*60}\n")

    rejection_feedback = ""
    last_verdict = {}
    formatter_content = ""

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"\n--- Pipeline attempt {attempt} of {MAX_ATTEMPTS} ---\n")

        crew, funnel_type = _build_human_crew(
            slot=args.slot,
            topic=args.topic,
            sources=args.sources,
            key_points=args.key_points,
        )

        # Retry on rate limit
        for rate_retry in range(1, 4):
            try:
                result = crew.kickoff(inputs={
                    "rejection_feedback": rejection_feedback,
                    "topic_json": json.dumps({
                        "topic": args.topic,
                        "funnel_type": funnel_type,
                        "angle": args.key_points.split(";")[0] if args.key_points else args.topic,
                        "content_type": "practical",
                    }),
                    "funnel_type": funnel_type,
                    "content_type": "practical",
                })
                break
            except Exception as exc:
                if "429" in str(exc) or "rate_limit" in str(exc).lower():
                    wait = 60 * rate_retry
                    print(f"  [RATE LIMIT] Waiting {wait}s before retry {rate_retry}/3...")
                    time.sleep(wait)
                    if rate_retry == 3:
                        raise
                else:
                    raise

        # Formatter output = second-to-last task
        if result.tasks_output and len(result.tasks_output) >= 2:
            formatter_raw = result.tasks_output[-2].raw or ""
        else:
            formatter_raw = ""
        formatter_content = _sanitize_article(_strip_code_fences(formatter_raw))

        # Production Director verdict = last task
        director_raw = result.tasks_output[-1].raw if result.tasks_output else ""
        verdict = _parse_director_verdict(director_raw or "")
        verdict = _correct_verdict(verdict, formatter_content)
        last_verdict = verdict

        decision = verdict.get("decision", "REJECT").upper()
        score = verdict.get("score", 0)
        issues = verdict.get("issues", [])

        print(f"\n{'='*60}")
        print(f"  PRODUCTION DIRECTOR: {decision}  (score {score}/100)")
        if issues:
            for issue in issues:
                print(f"    - {issue}")
        print(f"{'='*60}\n")

        _save_coaching_notes(verdict, args.slot)

        # Log cost if available
        try:
            from pipeline.utils.cost_logger import save_cost_log
            save_cost_log(result.token_usage, f"human-{args.slot}", attempt, decision)
        except Exception:
            pass

        if decision == "APPROVE" or attempt == MAX_ATTEMPTS:
            # Write the post regardless (human will review in PR)
            seo_data = {}
            try:
                seo_raw = result.tasks_output[1].raw or ""
                seo_data = _parse_seo_json(seo_raw)
            except Exception:
                pass

            _write_post(content=formatter_content, dry_run=False, funnel_type=funnel_type)

            slug = None
            try:
                from pipeline.run import _extract_frontmatter_field
                slug = _extract_frontmatter_field(formatter_content, "slug")
            except Exception:
                pass

            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            if slug:
                _update_gso_state(seo_data, slug, date_str)
            _generate_llms_txt()

            if decision != "APPROVE":
                print(f"  Note: Article scored {score}/100 but is being written for human review.")
            return

        # REJECT — retry with feedback
        rejection_feedback = (
            f"PREVIOUS ATTEMPT REJECTED. Score: {score}/100.\n"
            "Fix ALL issues:\n"
            + "\n".join(f"  - {i}" for i in issues)
        )

    # Should not reach here
    print("Pipeline completed.")


if __name__ == "__main__":
    main()
