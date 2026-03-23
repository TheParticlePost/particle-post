import json
from pathlib import Path

from crewai import Task, Agent

_FEEDBACK_PATH = Path(__file__).resolve().parent.parent / "data" / "writer_feedback.json"


def _load_recent_coaching(n: int = 5) -> str:
    """Load the last N coaching notes from the Production Director's feedback log."""
    if not _FEEDBACK_PATH.exists():
        return ""
    try:
        data = json.loads(_FEEDBACK_PATH.read_text(encoding="utf-8"))
        notes = data.get("notes", [])[-n:]
        if not notes:
            return ""
        lines = "\n".join(f"  - {note['text']}" for note in notes)
        return (
            "\nCOACHING FROM PREVIOUS ARTICLES (Production Director feedback — apply these lessons):\n"
            f"{lines}\n"
        )
    except Exception:
        return ""


def build_writing_task(agent: Agent, selection_task: Task) -> Task:
    coaching_context = _load_recent_coaching()

    return Task(
        description=(
            f"{coaching_context}"
            "Write a complete article based on the selected topic.\n\n"
            "Requirements:\n"
            "- Length: 900-1100 words\n"
            "- Audience: C-suite executives, senior analysts, institutional investors\n"
            "- Tone: Authoritative, direct, data-driven — like Bloomberg or The Economist\n"
            "- Structure:\n"
            "  1. Hook lede (2 sentences max — open with a named company, figure, or dollar amount)\n"
            "  2. Context paragraph (why this matters now)\n"
            "  3. 3-4 body sections with H2 headings\n"
            "  4. A 'Key Takeaway' callout (write it as: KEY TAKEAWAY: [insight])\n"
            "  5. Forward-looking conclusion\n"
            "  6. Sources list at the bottom\n\n"
            "- Include at least 2 concrete examples with named companies or real figures\n"
            "- Every statistic must cite a source inline: 'according to [Source]'\n"
            "- At least 3 inline source citations total\n"
            "- No rhetorical questions — state the answer instead\n"
            "- No passive voice\n"
            "- No AI clichés: delve, game-changing, transformative, groundbreaking, "
            "unprecedented, utilize, seamlessly\n\n"
            "You may use the tavily_search tool to verify specific facts or find additional data.\n\n"
            "Output the raw article text only. No markdown formatting yet (no # headings, "
            "no ** bold). Write sections naturally — the formatter will add markdown later.\n\n"
            "PREVIOUS REJECTION FEEDBACK (blank on first run — fix ALL listed issues if present):\n"
            "{rejection_feedback}"
        ),
        expected_output=(
            "A complete 900-1100 word article in plain prose with: a specific lede naming a "
            "company/figure/number, context paragraph, 3-4 body sections labeled with their "
            "heading text, at least 3 inline source citations, a KEY TAKEAWAY line, "
            "a conclusion, and a Sources section with URLs."
        ),
        agent=agent,
        context=[selection_task],
    )
