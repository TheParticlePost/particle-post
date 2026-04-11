#!/usr/bin/env python3
"""
pulse_refresh.py — Weekly Pulse dashboard data refresh.

Reads the last 14 days of published articles, asks Claude to extract
structured AI adoption / ROI / red flag signals, and upserts the results
into the Supabase pulse_* tables. Run via:

    python -m pipeline.pulse_refresh                # apply
    python -m pipeline.pulse_refresh --dry-run      # preview only

Designed to be invoked by .github/workflows/pulse-refresh.yml on a weekly
schedule. Failure modes are non-fatal — the dashboard already has a seed
data fallback in lib/pulse/seed-data.ts via lib/pulse/queries.ts, so a
broken refresh doesn't take the page down. The pulse_meta.refresh_status
column captures the outcome for the next run to inspect.

Required env vars:
    ANTHROPIC_API_KEY
    NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

# Soft imports — let the dry-run mode work without dependencies installed.
try:
    import anthropic  # type: ignore
except ImportError:
    anthropic = None  # type: ignore

try:
    from supabase import create_client  # type: ignore
except ImportError:
    create_client = None  # type: ignore

import yaml  # type: ignore


_REPO_ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = _REPO_ROOT / "blog" / "content" / "posts"

EXTRACTION_PROMPT = """You are extracting structured Pulse dashboard data from \
recent Particle Post articles.

Read the article excerpts below and extract:
1. SNAPSHOT METRICS (top-line numbers for the dashboard hero)
2. RED FLAGS (regulatory/risk signals from the last 30 days)
3. INDUSTRY ROI updates (any new ROI multipliers or payback periods cited)

Return STRICT JSON ONLY, matching this schema exactly. If a section has no
new data, return an empty array — never fabricate numbers.

{
  "snapshot": [
    {"label": "...", "value": "...", "numeric_value": <number>, "trend": "up|down|neutral", "display_order": <int>}
  ],
  "red_flags": [
    {"title": "...", "severity": "low|medium|high|critical", "description": "...", "source": "...", "date": "YYYY-MM-DD"}
  ],
  "industry_roi": [
    {"industry": "...", "roi_multiplier": <number>, "median_payback_months": <int>, "sample_size": <int>, "year": <int>, "source": "..."}
  ]
}

Rules:
- Every number must be sourced from one of the article excerpts. Cite the
  source field accurately (the article's named source, not the article itself).
- Date format: ISO YYYY-MM-DD.
- For snapshot rows, display_order should start at 1 and increment.
- If two articles cite different numbers for the same metric, prefer the
  more recent article.
- No prose outside the JSON. No code fences. Just the JSON object.

ARTICLE EXCERPTS:
"""


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    m = re.match(r"\A---\s*\n(.*?)\n---\s*\n(.*)", text, re.DOTALL)
    if not m:
        return {}, text
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        meta = {}
    return meta, m.group(2)


def gather_recent_articles(days: int = 14) -> list[dict[str, Any]]:
    """Return a list of {title, date, slug, excerpt} for articles published
    in the last `days` days. Excerpt is the first ~800 chars of body."""
    if not POSTS_DIR.exists():
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    out: list[dict[str, Any]] = []

    for path in sorted(POSTS_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(text)
        date_str = meta.get("date")
        if not date_str:
            continue
        try:
            article_date = datetime.fromisoformat(str(date_str).replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue
        if article_date < cutoff:
            continue

        excerpt = body.strip()[:1200]
        out.append({
            "title": meta.get("title", path.stem),
            "date": str(date_str),
            "slug": meta.get("slug", path.stem),
            "excerpt": excerpt,
        })

    return out


def call_claude(articles: list[dict[str, Any]]) -> dict[str, Any]:
    if anthropic is None:
        raise RuntimeError("anthropic SDK not installed; cannot run live extraction")

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    formatted = "\n\n---\n\n".join(
        f"### {a['title']} ({a['date']})\n\n{a['excerpt']}"
        for a in articles
    )

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=4000,
        messages=[
            {
                "role": "user",
                "content": EXTRACTION_PROMPT + formatted,
            }
        ],
    )

    raw = "".join(
        block.text for block in response.content if hasattr(block, "text")
    ).strip()

    # Trim possible code fence wrapping
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*\n", "", raw)
        raw = re.sub(r"\n```\s*$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Claude returned invalid JSON: {e}\n\n{raw[:500]}")


def upsert_to_supabase(extracted: dict[str, Any], source_count: int) -> None:
    if create_client is None:
        raise RuntimeError("supabase-py not installed; cannot upsert")

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not service_key:
        raise RuntimeError(
            "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
        )

    client = create_client(url, service_key)

    snapshot_rows = extracted.get("snapshot", [])
    red_flag_rows = extracted.get("red_flags", [])
    roi_rows = extracted.get("industry_roi", [])

    # Snapshot is a small singleton-style table — replace whole set
    if snapshot_rows:
        client.table("pulse_snapshot").delete().neq("display_order", -1).execute()
        client.table("pulse_snapshot").insert(snapshot_rows).execute()

    # Red flags: append-only, but keep table small (last 30)
    if red_flag_rows:
        for flag in red_flag_rows:
            flag.setdefault("active", True)
        client.table("pulse_red_flags").insert(red_flag_rows).execute()

    # Industry ROI: upsert by (industry, year)
    if roi_rows:
        for row in roi_rows:
            client.table("pulse_industry_roi").upsert(
                row, on_conflict="industry,year"
            ).execute()

    # Stamp pulse_meta
    client.table("pulse_meta").update({
        "last_refreshed_at": datetime.now(timezone.utc).isoformat(),
        "source_count": source_count,
        "refresh_status": "ok",
        "refresh_notes": (
            f"snapshot={len(snapshot_rows)} red_flags={len(red_flag_rows)} "
            f"roi={len(roi_rows)}"
        ),
    }).eq("id", 1).execute()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Extract data but do not upsert to Supabase",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=14,
        help="Look back N days when gathering articles (default: 14)",
    )
    args = parser.parse_args()

    print(f"[pulse_refresh] gathering articles from last {args.days} days...")
    articles = gather_recent_articles(args.days)
    print(f"[pulse_refresh] found {len(articles)} articles")

    if not articles:
        print("[pulse_refresh] no articles to process; exiting cleanly")
        return 0

    print(f"[pulse_refresh] calling Claude for extraction...")
    extracted = call_claude(articles)

    snapshot = extracted.get("snapshot", [])
    red_flags = extracted.get("red_flags", [])
    roi = extracted.get("industry_roi", [])
    print(
        f"[pulse_refresh] extracted: snapshot={len(snapshot)} "
        f"red_flags={len(red_flags)} roi={len(roi)}"
    )

    if args.dry_run:
        print("[pulse_refresh] DRY RUN — would upsert:")
        print(json.dumps(extracted, indent=2))
        return 0

    print("[pulse_refresh] upserting to Supabase...")
    upsert_to_supabase(extracted, source_count=len(articles))
    print("[pulse_refresh] done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
