import json
from pathlib import Path

from crewai import Task, Agent

_FEEDBACK_PATH  = Path(__file__).resolve().parent.parent / "data" / "writer_feedback.json"
_HISTORY_FILE   = Path(__file__).resolve().parents[2] / "blog" / "data" / "topics_history.json"
_STRATEGY_PATH  = Path(__file__).resolve().parent.parent / "config" / "content_strategy.json"


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


def _load_recent_posts(n: int = 10) -> str:
    """Load recent post titles + slugs for internal linking context."""
    if not _HISTORY_FILE.exists():
        return "No published posts yet."
    try:
        history = json.loads(_HISTORY_FILE.read_text(encoding="utf-8"))
        posts = history.get("posts", [])[-n:]
        if not posts:
            return "No published posts yet."
        lines = "\n".join(
            f"  - \"{p['title']}\" → /posts/{p['slug']}/"
            for p in posts
        )
        return lines
    except Exception:
        return "Could not load post history."


def _load_funnel_requirements(funnel_type: str) -> str:
    """Load the requirements for the given funnel type from content_strategy.json."""
    try:
        strategy = json.loads(_STRATEGY_PATH.read_text(encoding="utf-8"))
        ft = strategy["funnel_types"].get(funnel_type, {})
        req = []
        req.append(f"ARTICLE TYPE: {ft.get('name', funnel_type)}")
        req.append(f"PURPOSE: {ft.get('purpose', '')}")
        req.append(f"AUDIENCE: {ft.get('audience', '')}")
        wc = ft.get("word_count", {})
        req.append(f"WORD COUNT: {wc.get('target', 1000)} words (range: {wc.get('min', 600)}-{wc.get('max', 3000)})")
        req.append(f"H1 FORMAT: {ft.get('h1_format', '')}")
        req.append(f"SEO INTENT: {ft.get('seo_intent', '')}")
        req.append(f"TONE: {ft.get('tone', '')}")

        sections = ft.get("mandatory_sections", [])
        if sections:
            req.append("\nMANDATORY SECTIONS (ALL required, in this order):")
            for i, s in enumerate(sections, 1):
                req.append(f"  {i}. {s}")

        links = ft.get("internal_links", {})
        req.append("\nINTERNAL LINKING REQUIREMENTS:")
        for key, val in links.items():
            if key == "anchor_text_examples":
                req.append(f"  Anchor text examples: {', '.join(val)}")
            elif isinstance(val, dict) and "min" in val:
                required_str = " (REQUIRED)" if val.get("required") else " (optional)"
                purpose = val.get("purpose", "")
                req.append(f"  → {key}: min {val['min']} link(s){required_str} — {purpose}")

        forbidden = ft.get("forbidden", [])
        if forbidden:
            req.append("\nDO NOT INCLUDE:")
            for f in forbidden:
                req.append(f"  x {f}")

        ai_tells = strategy.get("ai_tells_to_avoid", [])
        if ai_tells:
            req.append("\nFORBIDDEN AI-TELL WORDS/PHRASES (never use):")
            req.append("  " + ", ".join(ai_tells))

        return "\n".join(req)
    except Exception as e:
        return f"(Could not load funnel requirements: {e})"


def build_writing_task(agent: Agent, selection_task: Task, funnel_type: str = "TOF") -> Task:
    coaching_context = _load_recent_coaching()
    recent_posts = _load_recent_posts()
    funnel_reqs = _load_funnel_requirements(funnel_type)

    word_targets = {"TOF": "600-1000", "MOF": "1800-3000", "BOF": "1200-2000"}
    word_range = word_targets.get(funnel_type, "900-1100")

    return Task(
        description=(
            f"{coaching_context}"
            f"Write a complete, publication-ready article based on the selected topic.\n\n"
            f"══════════════════════════════════════════════\n"
            f"  FUNNEL TYPE: {funnel_type}\n"
            f"══════════════════════════════════════════════\n\n"
            f"{funnel_reqs}\n\n"
            "══════════════════════════════════════════════\n"
            "  VOICE & STYLE (always applies)\n"
            "══════════════════════════════════════════════\n\n"
            "- Tone: Bloomberg / Economist — authoritative, direct, data-driven\n"
            "- Every sentence earns its place. Cut anything that does not add information.\n"
            "- Never passive voice when active is available.\n"
            "- Average sentence: 12-16 words. Max sentence: 25 words.\n"
            "- The lede (first 1-2 sentences) must name a specific company, person, dollar amount, or date.\n"
            "- Every statistic cites a source inline: 'according to [Source]' or '[Source] reports'\n"
            "- At least 3 inline source citations total.\n"
            "- Include concrete examples: named companies, specific percentages, real figures.\n"
            "- No rhetorical questions — state the answer instead.\n\n"
            "══════════════════════════════════════════════\n"
            "  INTERNAL LINKING\n"
            "══════════════════════════════════════════════\n\n"
            "Recent published posts (use these for internal links when topically relevant):\n"
            f"{recent_posts}\n\n"
            "Link format: [descriptive anchor text](/posts/slug-here/)\n"
            "Example: [our analysis of AI fraud detection trends](/posts/2026-03-21-fintech-ai-infrastructure-investment/)\n"
            "If no relevant post exists yet, write: [Read our deeper analysis on [topic]] — "
            "the formatter will resolve or remove this placeholder.\n\n"
            "══════════════════════════════════════════════\n"
            "  OUTPUT FORMAT\n"
            "══════════════════════════════════════════════\n\n"
            "Output the raw article text only. No markdown formatting yet (no # headings, "
            "no ** bold). Write sections naturally — the formatter will add markdown later.\n"
            "Label each section heading with its text on its own line.\n\n"
            "PREVIOUS REJECTION FEEDBACK (blank on first run — fix ALL listed issues if present):\n"
            "{rejection_feedback}"
        ),
        expected_output=(
            f"A complete {word_range} word article in plain prose with: a specific lede naming a "
            "company/figure/number, all mandatory sections for the funnel type (labeled with heading text), "
            "at least 3 inline source citations, internal links to related content, "
            "a Clear Verdict section, and a Sources section with URLs."
        ),
        agent=agent,
        context=[selection_task],
    )
