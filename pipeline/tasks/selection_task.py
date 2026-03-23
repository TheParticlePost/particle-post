import json
from datetime import datetime, timezone
from pathlib import Path
from crewai import Task, Agent

HISTORY_FILE   = Path(__file__).parents[2] / "blog" / "data" / "topics_history.json"
_STRATEGY_PATH = Path(__file__).resolve().parent.parent / "config" / "content_strategy.json"


def _get_funnel_type(slot: str) -> str:
    """Determine today's funnel type from the content strategy schedule."""
    try:
        strategy = json.loads(_STRATEGY_PATH.read_text(encoding="utf-8"))
        day = datetime.now(timezone.utc).strftime("%A")
        schedule = strategy.get("schedule", {})
        day_schedule = schedule.get(day, {"morning": "TOF", "evening": "MOF"})
        return day_schedule.get(slot, "TOF")
    except Exception:
        return "TOF" if slot == "morning" else "MOF"


def build_selection_task(agent: Agent, research_task: Task, slot: str) -> Task:
    # Load recent post titles to inject into prompt
    recent_titles = []
    if HISTORY_FILE.exists():
        try:
            history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
            recent_titles = [p["title"] for p in history.get("posts", [])[-30:]]
        except (json.JSONDecodeError, KeyError):
            pass

    recent_str = "\n".join(f"- {t}" for t in recent_titles) if recent_titles else "None yet."
    slot_label = "morning" if slot == "morning" else "evening"
    slot_index = 0 if slot == "morning" else 1

    funnel_type = _get_funnel_type(slot)
    funnel_descriptions = {
        "TOF": "Top of Funnel — short awareness article (600-1000 words) that challenges a myth or answers a question. H1 must be a question format ('Does X?', 'Can X?', 'Should X?').",
        "MOF": "Middle of Funnel — deep analysis article (1800-3000 words) that translates research for decision-makers evaluating an investment. H1 is a claim or decision-focused statement.",
        "BOF": "Bottom of Funnel — implementation guide (1200-2000 words) with step-by-step instructions, failure scenarios, and go/no-go criteria. H1 is action-focused ('How to...', '7 risks of...').",
    }

    return Task(
        description=(
            f"Select the best topic for the {slot_label} post from the research briefing.\n\n"
            f"TODAY'S CONTENT TYPE: {funnel_type}\n"
            f"Description: {funnel_descriptions[funnel_type]}\n\n"
            f"Recent post titles (avoid repeating these themes):\n{recent_str}\n\n"
            f"Instructions:\n"
            f"1. Review all topics in the research briefing.\n"
            f"2. Score each on: (a) trending relevance, (b) uniqueness vs recent posts, "
            f"(c) business/finance applicability, (d) fit for {funnel_type} content type.\n"
            f"3. Select the #{slot_index + 1} best topic (morning = highest score, "
            f"evening = second highest, with different sub-theme).\n"
            f"4. For a {funnel_type} article: choose an angle that fits the {funnel_type} format "
            f"(e.g., for TOF choose a myth to challenge; for MOF choose a research study to analyze; "
            f"for BOF choose an implementation challenge to solve).\n\n"
            f"Output format — a single JSON object:\n"
            "{\n"
            '  "title": "Proposed article title (compelling, under 70 chars)",\n'
            '  "topic_summary": "What this article will cover",\n'
            '  "angle": "The specific business/finance angle",\n'
            '  "funnel_type": "' + funnel_type + '",\n'
            '  "target_keywords": ["keyword1", "keyword2", "keyword3"],\n'
            '  "word_count_target": ' + str({"TOF": 750, "MOF": 2250, "BOF": 1600}[funnel_type]) + ',\n'
            '  "source_urls": ["url1", "url2"]\n'
            "}\n\n"
            "Return only the JSON object. No prose."
        ),
        expected_output=(
            "A single JSON object with title, topic_summary, angle, funnel_type, "
            "target_keywords, word_count_target, and source_urls."
        ),
        agent=agent,
        context=[research_task],
    )
