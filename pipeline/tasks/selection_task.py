import json
from pathlib import Path
from crewai import Task
from crewai import Agent

HISTORY_FILE = Path(__file__).parents[2] / "blog" / "data" / "topics_history.json"


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

    return Task(
        description=(
            f"Select the best topic for the {slot_label} post from the research briefing.\n\n"
            f"Recent post titles (avoid repeating these themes):\n{recent_str}\n\n"
            f"Instructions:\n"
            f"1. Review all topics in the research briefing.\n"
            f"2. Score each on: (a) trending relevance, (b) uniqueness vs recent posts, "
            f"(c) business/finance applicability.\n"
            f"3. Select the #{slot_index + 1} best topic (morning = highest score, "
            f"evening = second highest, with different sub-theme).\n"
            f"4. Choose an angle that makes this article distinct from anything published recently.\n\n"
            f"Output format — a single JSON object:\n"
            "{\n"
            '  "title": "Proposed article title (compelling, under 70 chars)",\n'
            '  "topic_summary": "What this article will cover",\n'
            '  "angle": "The specific business/finance angle",\n'
            '  "target_keywords": ["keyword1", "keyword2", "keyword3"],\n'
            '  "word_count_target": 1000,\n'
            '  "source_urls": ["url1", "url2"]\n'
            "}\n\n"
            "Return only the JSON object. No prose."
        ),
        expected_output=(
            "A single JSON object with title, topic_summary, angle, target_keywords, "
            "word_count_target, and source_urls."
        ),
        agent=agent,
        context=[research_task],
    )
