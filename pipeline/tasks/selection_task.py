import json
from datetime import datetime, timezone
from pathlib import Path
from crewai import Task, Agent

HISTORY_FILE   = Path(__file__).parents[2] / "blog" / "data" / "topics_history.json"
_STRATEGY_PATH = Path(__file__).resolve().parent.parent / "config" / "content_strategy.json"


def _get_schedule_info(slot: str) -> tuple:
    """Return (funnel_type, content_type) from content strategy schedule.

    Supports both old format (string value) and new format (dict with funnel + content_type).
    """
    try:
        strategy = json.loads(_STRATEGY_PATH.read_text(encoding="utf-8"))
        day = datetime.now(timezone.utc).strftime("%A")
        schedule = strategy.get("schedule", {})
        day_schedule = schedule.get(day, {})
        slot_info = day_schedule.get(slot, {})
        # Backward compat: old format stored just a string like "TOF"
        if isinstance(slot_info, str):
            return slot_info, "news"
        return slot_info.get("funnel", "TOF"), slot_info.get("content_type", "news")
    except Exception:
        return ("TOF" if slot == "morning" else "MOF"), "news"


# Keep old name as alias for any external imports
_get_funnel_type = lambda slot: _get_schedule_info(slot)[0]


def build_selection_task(agent: Agent, research_task: Task, slot: str, topic_override: str | None = None) -> Task:
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

    funnel_type, content_type = _get_schedule_info(slot)
    funnel_descriptions = {
        "TOF": "Top of Funnel — short awareness article (600-1000 words) that challenges a myth or answers a question. H1 must be a question format ('Does X?', 'Can X?', 'Should X?').",
        "MOF": "Middle of Funnel — deep analysis article (1800-3000 words) that translates research for decision-makers evaluating an investment. H1 is a claim or decision-focused statement.",
        "BOF": "Bottom of Funnel — implementation guide (1200-2000 words) with step-by-step instructions, failure scenarios, and go/no-go criteria. H1 is action-focused ('How to...', '7 risks of...').",
    }
    content_type_descriptions = {
        "practical": (
            "PRACTICAL — The article should be actionable and implementation-focused. "
            "Choose an angle suited to one of: how-to guide, case study, or tool comparison. "
            "Examples: 'How accountants boost productivity 40% using Claude in Excel', "
            "'Enterprise AI copilots compared: Copilot vs Duet AI for CFOs', "
            "'How JPMorgan deployed AI fraud detection — timeline, cost, results'."
        ),
        "news": (
            "NEWS ANALYSIS — The article should cover a current event or development "
            "with clear business implications. Not a data dump — must answer: "
            "'What should the reader DO with this information?'"
        ),
    }

    topic_directive = ""
    if topic_override:
        topic_directive = (
            f"MANDATORY TOPIC OVERRIDE: The editor has directed that today's article MUST cover:\n"
            f'"{topic_override}"\n\n'
            f"Select the research briefing entry that best matches this directive. "
            f"If no entry matches closely, use the directive itself as the topic and find the best angle for it. "
            f"This is non-negotiable — the selected topic MUST align with this directive.\n\n"
        )

    return Task(
        description=(
            f"Select the best topic for the {slot_label} post from the research briefing.\n\n"
            f"{topic_directive}"
            f"TODAY'S FUNNEL TYPE: {funnel_type}\n"
            f"Description: {funnel_descriptions[funnel_type]}\n\n"
            f"TODAY'S CONTENT TYPE: {content_type}\n"
            f"Description: {content_type_descriptions.get(content_type, content_type_descriptions['news'])}\n\n"
            f"THEME PREFERENCE: Prefer business-themed topics (targeting CEO, COO — 70% of articles) "
            f"over finance-themed topics (targeting CFO — 30% of articles). "
            f"Business = AI in enterprise operations, productivity, company moves. "
            f"Finance = AI in banking, trading, compliance, capital markets.\n\n"
            f"Recent post titles (avoid repeating these themes):\n{recent_str}\n\n"
            f"Instructions:\n"
            f"1. Review all topics in the research briefing.\n"
            f"2. Score each on: (a) trending relevance, (b) uniqueness vs recent posts, "
            f"(c) business/finance applicability (prefer business 70%), "
            f"(d) fit for {funnel_type} funnel type, "
            f"(e) fit for {content_type} content type (practical = how-to/case-study/comparison angle; "
            f"news = breaking event with implications).\n"
            f"3. Select the #{slot_index + 1} best topic (morning = highest score, "
            f"evening = second highest, with different sub-theme).\n"
            f"4. For a {funnel_type} article: choose an angle that fits the {funnel_type} format "
            f"(e.g., for TOF choose a myth to challenge; for MOF choose a research study to analyze; "
            f"for BOF choose an implementation challenge to solve).\n"
            f"5. For {content_type} content: shape the angle accordingly "
            f"({'practical: focus on steps, tools, outcomes, or comparison criteria' if content_type == 'practical' else 'news: focus on the event, its cause, and what readers should do'}).\n\n"
            f"Output format — a single JSON object:\n"
            "{\n"
            '  "title": "Proposed article title (compelling, under 70 chars)",\n'
            '  "topic_summary": "What this article will cover",\n'
            '  "angle": "The specific business/finance angle",\n'
            '  "funnel_type": "' + funnel_type + '",\n'
            '  "content_type": "' + content_type + '",\n'
            '  "target_keywords": ["keyword1", "keyword2", "keyword3"],\n'
            '  "word_count_target": ' + str({"TOF": 750, "MOF": 2250, "BOF": 1600}[funnel_type]) + ',\n'
            '  "source_urls": ["url1", "url2"]\n'
            "}\n\n"
            "Return only the JSON object. No prose."
        ),
        expected_output=(
            "A single JSON object with title, topic_summary, angle, funnel_type, content_type, "
            "target_keywords, word_count_target, and source_urls."
        ),
        agent=agent,
        context=[research_task],
    )
