"""
Research Memory — persistent learning for the Researcher and Topic Selector.

Tracks: what queries were used, what topics they produced, which articles
scored well, and what domains are over/under-covered. Loaded at the start
of each research phase and updated after publication.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

_MEMORY_PATH = Path(__file__).parents[1] / "data" / "research_memory.json"


def load_memory() -> dict:
    """Load research memory. Returns empty structure if file doesn't exist."""
    if not _MEMORY_PATH.exists():
        return _empty_memory()
    try:
        return json.loads(_MEMORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return _empty_memory()


def _empty_memory() -> dict:
    return {
        "last_updated": None,
        "total_runs": 0,
        "query_history": [],
        "successful_query_patterns": {
            "news_analysis": [],
            "deep_dive": [],
            "case_study": [],
            "how_to": [],
            "technology_profile": [],
            "industry_briefing": [],
        },
        "failed_query_patterns": [],
        "domain_coverage": {
            "finance": 0,
            "operations": 0,
            "supply_chain": 0,
            "hr": 0,
            "manufacturing": 0,
            "healthcare": 0,
            "compliance": 0,
            "technology": 0,
            "strategy": 0,
        },
        "content_gap_queue": [],
    }


def record_research_run(
    slot: str,
    content_type: str,
    queries_used: list[str],
    topics_found: int,
    topic_selected: str,
) -> None:
    """Record a research run (called after topic selection, before production)."""
    memory = load_memory()
    memory["total_runs"] += 1
    memory["last_updated"] = datetime.now(timezone.utc).isoformat()

    entry = {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "slot": slot,
        "content_type": content_type,
        "queries_used": queries_used,
        "topics_found": topics_found,
        "topic_selected": topic_selected,
        "director_score": None,
        "quality": None,
    }
    memory.setdefault("query_history", []).append(entry)
    # Keep last 100 entries
    memory["query_history"] = memory["query_history"][-100:]

    _save(memory)


def record_article_outcome(
    topic_title: str,
    director_score: int,
    content_type: str,
    domain: str,
    queries_used: list[str] | None = None,
) -> None:
    """Record article outcome (called after publication or rejection)."""
    memory = load_memory()

    quality = "high" if director_score >= 80 else "medium" if director_score >= 65 else "low"

    # Update the latest matching history entry. Try exact title match first
    # (research-phase title), then fall back to most recent unscored entry of
    # the matching content_type (since SEO/Editor often rewrites the title).
    matched = False
    for entry in reversed(memory.get("query_history", [])):
        if entry.get("topic_selected") == topic_title and entry.get("director_score") is None:
            entry["director_score"] = director_score
            entry["quality"] = quality
            matched = True
            break
    if not matched:
        for entry in reversed(memory.get("query_history", [])):
            if entry.get("content_type") == content_type and entry.get("director_score") is None:
                entry["director_score"] = director_score
                entry["quality"] = quality
                break

    # Track successful query patterns
    if quality in ("high", "medium") and queries_used:
        patterns = memory.setdefault("successful_query_patterns", {})
        ct_patterns = patterns.setdefault(content_type, [])
        for q in queries_used:
            if q not in ct_patterns:
                ct_patterns.append(q)
        # Keep last 20 per type
        patterns[content_type] = ct_patterns[-20:]

    # Update domain coverage
    coverage = memory.setdefault("domain_coverage", {})
    coverage[domain] = coverage.get(domain, 0) + 1

    _save(memory)


def get_research_context(content_type: str) -> str:
    """Build context string for the Researcher agent's prompt."""
    memory = load_memory()
    lines: list[str] = []

    # What queries worked for this content type before
    patterns = memory.get("successful_query_patterns", {}).get(content_type, [])
    if patterns:
        lines.append(f"QUERIES THAT PRODUCED GOOD {content_type.upper()} ARTICLES:")
        for q in patterns[-5:]:
            lines.append(f'  > "{q}"')
        lines.append("Use these as starting points, then VARY them to find fresh angles.")
        lines.append("")

    # What queries have been overused (appeared 3+ times in last 10 runs)
    recent = memory.get("query_history", [])[-10:]
    query_counts: dict[str, int] = {}
    for entry in recent:
        for q in entry.get("queries_used", []):
            query_counts[q] = query_counts.get(q, 0) + 1
    overused = [q for q, c in query_counts.items() if c >= 3]
    if overused:
        lines.append("OVERUSED QUERIES (do NOT repeat these exact phrases, rephrase or find alternatives):")
        for q in overused:
            lines.append(f'  x "{q}"')
        lines.append("")

    # Domain coverage imbalance
    coverage = memory.get("domain_coverage", {})
    total = sum(coverage.values()) or 1
    under_covered = [(k, v) for k, v in coverage.items() if v / total < 0.08 and k != "strategy"]
    if under_covered:
        lines.append("UNDER-COVERED DOMAINS (actively seek topics in these areas):")
        for domain, count in under_covered:
            lines.append(f"  -> {domain} ({count} articles, {count / total * 100:.0f}% of total)")
        lines.append("")

    # Content gaps from Marketing Director
    gaps = memory.get("content_gap_queue", [])
    if gaps:
        lines.append("CONTENT GAPS IDENTIFIED BY MARKETING DIRECTOR (high priority):")
        for gap in gaps[:5]:
            lines.append(f"  -> {gap}")
        lines.append("")

    return "\n".join(lines) if lines else ""


def sync_content_gaps(gaps: list[str]) -> None:
    """Sync content gap priorities from the Marketing Director."""
    memory = load_memory()
    memory["content_gap_queue"] = gaps[:10]
    _save(memory)


def classify_domain(tags: list[str]) -> str:
    """Classify an article's domain from its tags."""
    tag_str = " ".join(t.lower() for t in tags)
    if any(k in tag_str for k in ("finance", "banking", "payment", "accounting", "investment")):
        return "finance"
    if any(k in tag_str for k in ("supply chain", "logistics", "warehouse")):
        return "supply_chain"
    if any(k in tag_str for k in ("manufacturing", "production", "factory")):
        return "manufacturing"
    if any(k in tag_str for k in ("hr", "workforce", "talent", "hiring", "compensation")):
        return "hr"
    if any(k in tag_str for k in ("compliance", "regulation", "governance", "audit")):
        return "compliance"
    if any(k in tag_str for k in ("healthcare", "medical", "clinical")):
        return "healthcare"
    if any(k in tag_str for k in ("operations", "process", "automation")):
        return "operations"
    if any(k in tag_str for k in ("strategy", "leadership", "transformation")):
        return "strategy"
    return "technology"


def _save(memory: dict) -> None:
    _MEMORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    _MEMORY_PATH.write_text(
        json.dumps(memory, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
