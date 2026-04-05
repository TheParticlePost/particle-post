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


def extract_comparisons(body: str) -> list[dict]:
    """Extract before/after and versus comparisons."""
    comparisons = []

    # Before/after patterns
    # "from $X to $Y", "reduced from X to Y"
    for m in re.finditer(
        r'(?:from|reduced|decreased|increased|grew)\s+(.+?)\s+to\s+(.+?)(?:\.|,|\s)',
        body, re.IGNORECASE,
    ):
        comparisons.append({
            "type": "before_after",
            "before": m.group(1).strip(),
            "after": m.group(2).strip(),
            "context": _extract_sentence(body, m.start()),
        })

    # Versus patterns: "X vs Y", "X versus Y"
    for m in re.finditer(
        r'(\w[\w\s]{2,30})\s+(?:vs\.?|versus|compared to)\s+(\w[\w\s]{2,30})',
        body, re.IGNORECASE,
    ):
        comparisons.append({
            "type": "versus",
            "option_a": m.group(1).strip(),
            "option_b": m.group(2).strip(),
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


def select_visuals(
    content_type: str,
    stats: list[dict],
    steps: list[str],
    comparisons: list[dict],
    timeline: list[dict],
) -> list[dict]:
    """Decide which graphics to generate based on content type and available data.

    Returns a list of visual specifications: [{"type": "...", "data": {...}}]
    """
    visuals = []

    if content_type == "news_analysis":
        # 1 stat card (headline number)
        if stats:
            best = stats[0]
            visuals.append({
                "type": "stat_card",
                "data": {
                    "number": best["value"],
                    "label": best["sentence"][:60] if best.get("sentence") else best["context"][:60],
                    "source": "",
                },
            })

    elif content_type == "deep_dive":
        # 1 chart + 1 stat card
        if len(stats) >= 3:
            chart_data = [
                {"label": s["value"], "value": _parse_number(s["value"])}
                for s in stats[:5]
                if _parse_number(s["value"]) > 0
            ]
            if chart_data:
                visuals.append({
                    "type": "chart_bar_horizontal",
                    "data": {"data": chart_data, "title": "Key Metrics", "source": ""},
                })
        if stats:
            visuals.append({
                "type": "stat_card",
                "data": {
                    "number": stats[0]["value"],
                    "label": stats[0].get("sentence", "")[:60],
                    "source": "",
                },
            })

    elif content_type == "case_study":
        # Before/after (mandatory) + timeline (mandatory)
        if comparisons:
            ba = comparisons[0]
            if ba["type"] == "before_after":
                visuals.append({
                    "type": "before_after",
                    "data": {
                        "before_label": "Before",
                        "before_value": ba["before"],
                        "after_label": "After",
                        "after_value": ba["after"],
                        "metric": "",
                        "source": "",
                    },
                })
        if timeline:
            visuals.append({
                "type": "timeline",
                "data": {"events": timeline[:6]},
            })

    elif content_type == "how_to":
        # Process flow (mandatory)
        if steps:
            visuals.append({
                "type": "process_flow",
                "data": {"steps": steps[:6]},
            })

    elif content_type == "technology_profile":
        # Bar chart comparison
        if len(stats) >= 2:
            chart_data = [
                {"label": s["context"][:20], "value": _parse_number(s["value"])}
                for s in stats[:5]
                if _parse_number(s["value"]) > 0
            ]
            if chart_data:
                visuals.append({
                    "type": "chart_bar_horizontal",
                    "data": {"data": chart_data, "title": "Comparison", "source": ""},
                })

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
