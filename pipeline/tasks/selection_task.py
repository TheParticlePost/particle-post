import json
from datetime import datetime, timezone
from pathlib import Path
from crewai import Task, Agent

HISTORY_FILE   = Path(__file__).parents[2] / "blog" / "data" / "topics_history.json"
_STRATEGY_PATH = Path(__file__).resolve().parent.parent / "config" / "content_strategy.json"

# Map content_type → funnel stage
_CONTENT_TYPE_TO_FUNNEL = {
    "news_analysis":      "TOF",
    "deep_dive":          "MOF",
    "case_study":         "MOF",
    "how_to":             "BOF",
    "technology_profile": "MOF",
    "industry_briefing":  "TOF",
    # Legacy values
    "practical":          "MOF",
    "news":               "TOF",
}


def _get_schedule_info(slot: str) -> tuple:
    """Return (funnel_type, content_type) from content strategy schedule.

    Supports three formats:
    - Legacy string value (e.g. "TOF")
    - Old dict with funnel + content_type keys
    - New dict with content_type only (funnel derived from content_type)
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
        content_type = slot_info.get("content_type", "news")
        # If funnel is explicit in the schedule, use it; otherwise derive from content_type
        funnel = slot_info.get("funnel", _CONTENT_TYPE_TO_FUNNEL.get(content_type, "TOF"))
        return funnel, content_type
    except Exception:
        defaults = {"morning": ("TOF", "news_analysis"), "afternoon": ("MOF", "deep_dive"), "evening": ("BOF", "how_to")}
        return defaults.get(slot, ("TOF", "news_analysis"))


# Keep old name as alias for any external imports
_get_funnel_type = lambda slot: _get_schedule_info(slot)[0]


def build_selection_task(agent: Agent, research_task: Task, slot: str, topic_override: str | None = None) -> Task:
    # Load recent post titles to inject into prompt
    recent_entries = []
    if HISTORY_FILE.exists():
        try:
            history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
            for p in history.get("posts", [])[-100:]:
                tags = ", ".join(t[:15] for t in p.get("tags", [])[:3])
                recent_entries.append(f"- {p['title']} [{tags}]")
        except (json.JSONDecodeError, KeyError):
            pass

    recent_str = "\n".join(recent_entries) if recent_entries else "None yet."
    slot_labels = {"morning": "morning", "afternoon": "afternoon", "evening": "evening"}
    slot_label = slot_labels.get(slot, slot)
    slot_indices = {"morning": 0, "afternoon": 1, "evening": 2}
    slot_index = slot_indices.get(slot, 0)

    funnel_type, content_type = _get_schedule_info(slot)
    funnel_descriptions = {
        "TOF": "Top of Funnel — short awareness article (600-1000 words) that challenges a myth or answers a question. H1 must be a question format ('Does X?', 'Can X?', 'Should X?').",
        "MOF": "Middle of Funnel — deep analysis article (1800-3000 words) that translates research for decision-makers evaluating an investment. H1 is a claim or decision-focused statement.",
        "BOF": "Bottom of Funnel — implementation guide (1200-2000 words) with step-by-step instructions, failure scenarios, and go/no-go criteria. H1 is action-focused ('How to...', '7 risks of...').",
    }
    content_type_descriptions = {
        "news_analysis": (
            "NEWS ANALYSIS — Breaking AI news with business implications. "
            "600-1000 words. H1 as a question. Must answer: "
            "'What should the reader DO with this information?'"
        ),
        "deep_dive": (
            "DEEP DIVE — In-depth analysis of a trend, study, or strategic shift. "
            "2000-3000 words. Data-heavy, evaluative. H1 is analytical."
        ),
        "case_study": (
            "CASE STUDY — Real-world AI deployment with timeline, costs, results, "
            "lessons learned. 1500-2500 words. H1 format: company + outcome."
        ),
        "how_to": (
            "HOW-TO GUIDE — Step-by-step implementation guide with prerequisites, "
            "failure scenarios, success metrics. 1200-2000 words. H1 is action-focused."
        ),
        "technology_profile": (
            "TECHNOLOGY PROFILE — Vendor/tool comparison or technology landscape "
            "assessment with scoring criteria. 1500-2500 words. H1 is comparison-focused."
        ),
        "industry_briefing": (
            "INDUSTRY BRIEFING — Sector-specific AI adoption roundup. "
            "1000-1500 words. Rotating sectors: Logistics, Manufacturing, Healthcare, "
            "Professional Services, Retail, Energy. H1 is sector-focused."
        ),
        # Legacy values
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

    # Word count target based on content type definitions
    word_count_targets = {
        "news_analysis": 750,
        "deep_dive": 2500,
        "case_study": 2000,
        "how_to": 1600,
        "technology_profile": 2000,
        "industry_briefing": 1250,
    }
    word_count = word_count_targets.get(
        content_type,
        {"TOF": 750, "MOF": 2250, "BOF": 1600}.get(funnel_type, 1500),
    )

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
            f"PUBLISHED ARTICLES (ZERO REPETITION — you MUST select a topic that covers a "
            f"DIFFERENT company, technology, regulation, or use case than ANY article below. "
            f"Same theme with a different angle is NOT sufficient — the core subject must be distinct):\n"
            f"{recent_str}\n\n"
            f"Instructions:\n"
            f"1. Review all topics in the research briefing.\n"
            f"2. Score each on: (a) trending relevance, (b) uniqueness vs recent posts, "
            f"(c) business/finance applicability (prefer business 70%), "
            f"(d) fit for {funnel_type} funnel type, "
            f"(e) fit for {content_type} content type.\n"
            f"3. Select the #{slot_index + 1} best topic (morning = highest score, "
            f"afternoon = second highest, evening = third highest, each with a different sub-theme).\n"
            f"4. For a {funnel_type} article: choose an angle that fits the {funnel_type} format "
            f"(e.g., for TOF choose a myth to challenge; for MOF choose a research study to analyze; "
            f"for BOF choose an implementation challenge to solve).\n"
            f"5. For {content_type} content: shape the angle to match the content type requirements.\n\n"
            f"Output format — a single JSON object:\n"
            "{\n"
            '  "title": "Proposed article title (compelling, under 70 chars)",\n'
            '  "topic_summary": "What this article will cover",\n'
            '  "angle": "The specific business/finance angle",\n'
            '  "funnel_type": "' + funnel_type + '",\n'
            '  "content_type": "' + content_type + '",\n'
            '  "target_keywords": ["keyword1", "keyword2", "keyword3"],\n'
            '  "word_count_target": ' + str(word_count) + ',\n'
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
