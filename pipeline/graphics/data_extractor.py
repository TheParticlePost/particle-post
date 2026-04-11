"""
Data extractor for article content.
Extracts statistics, steps, comparisons, and timelines from article body
using regex patterns. Pure Python, no LLM calls.
"""

import re
from typing import Optional


def extract_statistics(body: str) -> list[dict]:
    """Extract percentages, dollar amounts, and large numbers from text."""
    stats = []

    # Percentages: "42%", "88.5%"
    for m in re.finditer(r'(\d+(?:\.\d+)?)\s*%', body):
        # Get surrounding context (20 chars before/after)
        start = max(0, m.start() - 60)
        end = min(len(body), m.end() + 60)
        context = body[start:end].strip()
        # Find the sentence containing this stat
        sentence = _extract_sentence(body, m.start())
        stats.append({
            "type": "percentage",
            "value": f"{m.group(1)}%",
            "context": context,
            "sentence": sentence,
        })

    # Dollar amounts: "$4.2M", "$15 billion", "$800K"
    for m in re.finditer(
        r'\$[\d,.]+\s*(?:billion|million|trillion|[BMKTbmkt])?', body
    ):
        sentence = _extract_sentence(body, m.start())
        stats.append({
            "type": "dollar",
            "value": m.group(0).strip(),
            "context": body[max(0, m.start() - 40):m.end() + 40].strip(),
            "sentence": sentence,
        })

    # Large numbers: "1,200 employees", "15 million users"
    for m in re.finditer(
        r'(\d{1,3}(?:,\d{3})+|\d+\s*(?:million|billion|thousand))\s+\w+',
        body, re.IGNORECASE,
    ):
        sentence = _extract_sentence(body, m.start())
        stats.append({
            "type": "number",
            "value": m.group(0).strip(),
            "context": body[max(0, m.start() - 40):m.end() + 40].strip(),
            "sentence": sentence,
        })

    # Deduplicate by value
    seen = set()
    unique = []
    for s in stats:
        if s["value"] not in seen:
            seen.add(s["value"])
            unique.append(s)

    return unique[:10]  # Cap at 10 most relevant


def extract_steps(body: str) -> list[str]:
    """Extract numbered steps or step-like H2 headings."""
    steps = []

    # Pattern 1: "## Step 1: Do Something"
    for m in re.finditer(r'^##\s+(?:Step\s+\d+[:.]\s*)?(.+)', body, re.MULTILINE):
        step = m.group(1).strip()
        if len(step) > 5 and not step.startswith("FAQ"):
            steps.append(step)

    # Pattern 2: "1. Do something" (numbered list items)
    if len(steps) < 3:
        for m in re.finditer(r'^\d+\.\s+\*?\*?(.+?)\*?\*?\s*$', body, re.MULTILINE):
            step = m.group(1).strip()
            if len(step) > 5:
                steps.append(step)

    return steps[:8]  # Cap at 8 steps


def _trim_comparison_value(raw: str, limit: int = 32) -> str:
    """Trim a before/after value to a terse form that fits the visual card.

    Strategy:
      1. Prefer the first numeric token (e.g. "$0.38/mile") if any.
      2. Otherwise keep up to ``limit`` chars at a word boundary.
    """
    raw = raw.strip().rstrip(".,;:").strip()
    if not raw:
        return raw
    # Prefer a numeric fragment
    num_match = re.search(r'\$?\d[\d,.%]*\s*(?:[a-zA-Z/]{1,12})?', raw)
    if num_match and num_match.end() - num_match.start() <= limit:
        return num_match.group(0).strip().rstrip(".,;:")
    if len(raw) <= limit:
        return raw
    # Word-boundary truncate
    clipped = raw[:limit]
    if " " in clipped:
        clipped = clipped.rsplit(" ", 1)[0]
    return clipped.rstrip(".,;:") + "…"


def extract_comparisons(body: str) -> list[dict]:
    """Extract before/after and versus comparisons with terse values.

    Values are trimmed to 32 chars max so the BeforeAfter component
    doesn't clip long sentences.
    """
    comparisons = []

    # Before/after patterns
    # "from $X to $Y", "reduced from X to Y"
    for m in re.finditer(
        r'(?:from|reduced|decreased|increased|grew)\s+(.+?)\s+to\s+(.+?)(?:\.|,|\s)',
        body, re.IGNORECASE,
    ):
        before = _trim_comparison_value(m.group(1))
        after = _trim_comparison_value(m.group(2))
        if before and after:
            comparisons.append({
                "type": "before_after",
                "before": before,
                "after": after,
                "context": _extract_sentence(body, m.start()),
            })

    # Versus patterns: "X vs Y", "X versus Y"
    for m in re.finditer(
        r'(\w[\w\s]{2,30})\s+(?:vs\.?|versus|compared to)\s+(\w[\w\s]{2,30})',
        body, re.IGNORECASE,
    ):
        comparisons.append({
            "type": "versus",
            "option_a": _trim_comparison_value(m.group(1)),
            "option_b": _trim_comparison_value(m.group(2)),
            "context": _extract_sentence(body, m.start()),
        })

    return comparisons[:5]


def extract_timeline(body: str) -> list[dict]:
    """Extract date + event pairs for timeline visualization."""
    events = []

    # Patterns: "In Q1 2025, ...", "By March 2026, ...", "2025: ..."
    for m in re.finditer(
        r'(?:In|By|During|Since)\s+(Q[1-4]\s+\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4})[,:]?\s+(.+?)(?:\.|$)',
        body, re.IGNORECASE | re.MULTILINE,
    ):
        events.append({
            "date": m.group(1).strip(),
            "event": m.group(2).strip()[:80],  # Truncate long events
        })

    # Also: "2025 — event" or "2025: event"
    for m in re.finditer(r'(\d{4})\s*[:\u2014\u2013-]\s+(.+?)(?:\.|$)', body, re.MULTILINE):
        event = m.group(2).strip()[:80]
        if len(event) > 10:
            events.append({"date": m.group(1), "event": event})

    # Deduplicate by date
    seen = set()
    unique = []
    for e in events:
        if e["date"] not in seen:
            seen.add(e["date"])
            unique.append(e)

    return unique[:8]


def _label_from_context(ctx: str, limit: int = 40) -> str:
    """Trim a stat's surrounding context to a short, clean label."""
    ctx = (ctx or "").strip().replace("\n", " ")
    # Remove redundant leading words
    for lead in ("approximately ", "around ", "nearly ", "about "):
        if ctx.lower().startswith(lead):
            ctx = ctx[len(lead):]
    if len(ctx) <= limit:
        return ctx
    clipped = ctx[:limit]
    if " " in clipped:
        clipped = clipped.rsplit(" ", 1)[0]
    return clipped + "…"


def select_visuals(
    content_type: str,
    stats: list[dict],
    steps: list[str],
    comparisons: list[dict],
    timeline: list[dict],
) -> list[dict]:
    """Decide which graphics to generate based on content type and available data.

    Target visual density:
      case_study, deep_dive      → 4-6 visuals (dense data presentation)
      how_to                     → 2-3 visuals (process + outcomes)
      technology_profile         → 2-3 visuals (comparison charts)
      news_analysis              → 1-2 visuals (scrollable length)
      industry_briefing          → 2-3 visuals

    Returns a list of visual specifications: [{"type": "...", "data": {...}}]
    """
    visuals: list[dict] = []

    def _stat_card(stat: dict, heading: str) -> dict:
        return {
            "type": "stat_card",
            "insert_after_heading": heading,
            "data": {
                "number": stat["value"],
                "label": _label_from_context(stat.get("sentence") or stat.get("context", "")),
                "source": "",
            },
        }

    def _bar_chart(source_stats: list[dict], title: str, heading: str) -> dict | None:
        data = [
            {"label": _label_from_context(s.get("sentence") or s.get("context", ""), 24),
             "value": _parse_number(s["value"])}
            for s in source_stats
            if _parse_number(s["value"]) > 0
        ]
        if len(data) < 3:
            return None
        return {
            "type": "chart_bar_horizontal",
            "insert_after_heading": heading,
            "data": {"data": data[:6], "title": title, "source": ""},
        }

    if content_type == "case_study":
        # Target: 4-6 visuals. Every hook the extractor finds becomes a visual.
        # NB: before_after spec emission has been deliberately removed — the
        # {{< before-after >}} component is banned (see writer_backstory.txt
        # BEFORE / AFTER CARD section). Present before/after as either a
        # {{< bar-chart >}} with two bars or plain prose.

        chart = _bar_chart(stats[:6], "Key metrics", "Results")
        if chart:
            visuals.append(chart)

        # Up to 3 stat cards placed at meaningful sections
        stat_headings = ["Financial impact", "Results", "Implementation"]
        for i, stat in enumerate(stats[:3]):
            visuals.append(_stat_card(stat, stat_headings[i % len(stat_headings)]))

        if timeline:
            visuals.append({
                "type": "timeline",
                "insert_after_heading": "Implementation",
                "data": {"events": timeline[:5]},
            })

        if steps and len(steps) >= 3:
            visuals.append({
                "type": "process_flow",
                "insert_after_heading": "How they did it",
                "data": {"steps": steps[:5]},
            })

    elif content_type == "deep_dive":
        # Target: 4-6 visuals. Research-heavy presentation.
        chart = _bar_chart(stats[:6], "Research findings", "Research")
        if chart:
            visuals.append(chart)

        stat_headings = ["Research", "Implications", "Findings", "Analysis"]
        for i, stat in enumerate(stats[:4]):
            visuals.append(_stat_card(stat, stat_headings[i % len(stat_headings)]))

        if timeline:
            visuals.append({
                "type": "timeline",
                "insert_after_heading": "Evolution",
                "data": {"events": timeline[:5]},
            })

        if steps and len(steps) >= 3:
            visuals.append({
                "type": "process_flow",
                "insert_after_heading": "Framework",
                "data": {"steps": steps[:5]},
            })

    elif content_type == "news_analysis":
        if stats:
            best = stats[0]
            visuals.append({
                "type": "stat_card",
                "insert_after_heading": "What Happened",
                "data": {
                    "number": best["value"],
                    "label": _label_from_context(best.get("sentence") or best.get("context", "")),
                    "source": "",
                },
            })
        chart = _bar_chart(stats[:4], "By the numbers", "Context")
        if chart:
            visuals.append(chart)

    elif content_type == "industry_briefing":
        chart = _bar_chart(stats[:5], "Industry signals", "Overview")
        if chart:
            visuals.append(chart)
        for i, stat in enumerate(stats[:2]):
            visuals.append(_stat_card(stat, ["Overview", "Outlook"][i]))

    elif content_type == "how_to":
        if steps:
            visuals.append({
                "type": "process_flow",
                "insert_after_heading": "Step",
                "data": {"steps": steps[:6]},
            })
        if stats:
            visuals.append(_stat_card(stats[0], "Outcome"))

    elif content_type == "technology_profile":
        chart = _bar_chart(stats[:5], "Vendor landscape", "Vendor Landscape")
        if chart:
            visuals.append(chart)
        # NB: before_after spec emission removed. Use a bar-chart with two
        # bars (option A vs option B) for vendor comparisons instead.

    return visuals


def _extract_sentence(body: str, pos: int) -> str:
    """Extract the sentence containing the given position."""
    # Find sentence start (previous period, newline, or start of text)
    start = body.rfind(".", 0, pos)
    start = max(start + 1, body.rfind("\n", 0, pos) + 1, 0)
    # Find sentence end
    end = body.find(".", pos)
    if end == -1:
        end = min(pos + 100, len(body))
    else:
        end += 1
    return body[start:end].strip()[:120]


def _parse_number(value: str) -> float:
    """Try to extract a numeric value from a stat string."""
    # Remove $ and % signs, commas
    cleaned = re.sub(r'[$%,]', '', value)
    # Handle suffixes
    multipliers = {"b": 1e9, "m": 1e6, "k": 1e3, "t": 1e12}
    match = re.match(r'([\d.]+)\s*([bmkt])?', cleaned, re.IGNORECASE)
    if match:
        num = float(match.group(1))
        suffix = (match.group(2) or "").lower()
        return num * multipliers.get(suffix, 1)
    try:
        return float(cleaned.split()[0])
    except (ValueError, IndexError):
        return 0
