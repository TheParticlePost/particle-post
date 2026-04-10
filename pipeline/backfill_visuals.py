"""
Backfill: regenerate existing PNG visuals in published articles using
the new SVG templates. Scans each article body for references to
`.../visuals/{slug}-{type}.png`, re-extracts the matching data from the
same article body, re-renders the SVG with the updated templates, and
uploads the PNG at the same Supabase URL (overwrite).

This fixes things like the illegible timeline on the Kodiak article
without touching any prose. Adds a frontmatter marker
`visuals_generation: "v2"` so re-runs are idempotent.

Usage:
    python -m pipeline.backfill_visuals                  # full
    python -m pipeline.backfill_visuals --dry-run        # preview
    python -m pipeline.backfill_visuals --slug kodiak    # filter
    python -m pipeline.backfill_visuals --limit 3        # staged
    python -m pipeline.backfill_visuals --force          # re-process v2 articles

Required env vars (via .env):
    SUPABASE_URL  (or NEXT_PUBLIC_SUPABASE_URL)
    SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Any

import yaml

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

PROJECT_ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = PROJECT_ROOT / "blog" / "content" / "posts"

sys.path.insert(0, str(PROJECT_ROOT))
from pipeline.graphics.data_extractor import (  # noqa: E402
    extract_statistics,
    extract_steps,
    extract_comparisons,
    extract_timeline,
)
from pipeline.graphics.templates import (  # noqa: E402
    stat_card,
    diagram_before_after,
    diagram_process_flow,
    diagram_timeline,
    chart_bar_horizontal,
)
from pipeline.graphics.renderer import render_sync, intrinsic_svg_size  # noqa: E402
from pipeline.graphics.uploader import upload_to_supabase  # noqa: E402


# Maps the filename suffix in the visual URL to the renderer function
# and the default (width, height) to use when rasterizing. Dynamic-height
# templates (e.g. vertical timeline) use None for height and the
# backfill reads the SVG's own width/height attributes instead.
RENDERERS: dict[str, tuple] = {
    "stat_card":           (stat_card, 400, 200),
    "before_after":        (diagram_before_after, 800, 250),
    "process_flow":        (diagram_process_flow, 1000, 150),
    "timeline":            (diagram_timeline, 800, None),
    "chart_bar_horizontal": (chart_bar_horizontal, 800, 300),
}


def split_frontmatter(text: str) -> tuple[str, str, str]:
    if not text.startswith("---"):
        raise ValueError("no frontmatter")
    parts = text.split("---", 2)
    if len(parts) < 3:
        raise ValueError("malformed frontmatter")
    return parts[0], parts[1], parts[2]


def find_visual_refs(body: str, slug: str) -> list[str]:
    """Return the list of visual type suffixes referenced in the body.

    Matches URLs like:
        https://.../visuals/{slug}-{type}.png
    """
    pattern = rf"/visuals/{re.escape(slug)}-([a-z_]+)\.png"
    return sorted(set(re.findall(pattern, body)))


def regenerate_visual(
    visual_type: str,
    stats: list[dict],
    steps: list[str],
    comparisons: list[dict],
    timeline: list[dict],
) -> str | None:
    """Call the right renderer with data re-extracted from the article body.

    Returns the generated SVG string, or None if there isn't enough data.
    """
    if visual_type == "stat_card":
        if not stats:
            return None
        s = stats[0]
        label_src = s.get("sentence") or s.get("context", "")
        label = label_src.strip().replace("\n", " ")[:60]
        return stat_card(s["value"], label, "")

    if visual_type == "before_after":
        ba = next((c for c in comparisons if c.get("type") == "before_after"), None)
        if not ba:
            return None
        return diagram_before_after(
            "Before", ba["before"],
            "After", ba["after"],
            metric="", source="",
        )

    if visual_type == "process_flow":
        if not steps:
            return None
        return diagram_process_flow(steps[:5])

    if visual_type == "timeline":
        if not timeline:
            return None
        return diagram_timeline(timeline[:5])

    if visual_type == "chart_bar_horizontal":
        if len(stats) < 3:
            return None
        from pipeline.graphics.data_extractor import _parse_number
        data = [
            {"label": s.get("sentence", "")[:24] or s.get("value", "")[:24],
             "value": _parse_number(s["value"])}
            for s in stats[:6]
            if _parse_number(s["value"]) > 0
        ]
        if len(data) < 3:
            return None
        return chart_bar_horizontal(data, title="Key metrics", source="")

    return None


def process_article(
    filepath: Path,
    *,
    dry_run: bool,
    force: bool,
    index: int,
    total: int,
) -> dict[str, Any]:
    text = filepath.read_text(encoding="utf-8")
    try:
        leading, fm_text, body = split_frontmatter(text)
    except ValueError as e:
        return {"file": filepath.name, "status": "error", "reason": str(e)}

    fm = yaml.safe_load(fm_text) or {}
    if not isinstance(fm, dict):
        return {"file": filepath.name, "status": "error", "reason": "fm not mapping"}

    slug = (fm.get("slug") or filepath.stem).strip()

    # Idempotency — v3 is current. v2 articles will be re-processed so
    # they pick up the new vertical timeline and other template changes.
    if not force and fm.get("visuals_generation") == "v3":
        print(f"  [{index}/{total}] {slug:55.55}  SKIP (already v3)")
        return {"slug": slug, "status": "skipped"}

    # Find existing visual references in the body
    visual_types = find_visual_refs(body, slug)
    if not visual_types:
        # Mark the article as "v2" anyway so the idempotency check catches it
        if not dry_run:
            fm["visuals_generation"] = "v2"
            new_fm = yaml.safe_dump(
                fm, sort_keys=False, allow_unicode=True, width=4096, default_flow_style=False,
            )
            filepath.write_text(f"{leading}---\n{new_fm}---{body}", encoding="utf-8")
        print(f"  [{index}/{total}] {slug:55.55}  NO-VISUALS")
        return {"slug": slug, "status": "no-visuals"}

    # Extract data once
    stats = extract_statistics(body)
    steps = extract_steps(body)
    comparisons = extract_comparisons(body)
    timeline = extract_timeline(body)

    if dry_run:
        print(f"  [{index}/{total}] {slug:55.55}  DRY-RUN types={visual_types}")
        return {"slug": slug, "status": "dry-run", "types": visual_types}

    tmp_dir = Path(tempfile.gettempdir()) / "particle-backfill-visuals"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    regenerated: list[str] = []
    failed: list[str] = []
    for vtype in visual_types:
        if vtype not in RENDERERS:
            failed.append(f"{vtype} (unknown type)")
            continue

        svg = regenerate_visual(vtype, stats, steps, comparisons, timeline)
        if not svg:
            failed.append(f"{vtype} (no data)")
            continue

        _, default_w, default_h = RENDERERS[vtype]
        # For dynamic-height templates, read the intrinsic size from the
        # SVG so we render exactly what the template produced.
        intrinsic_w, intrinsic_h = intrinsic_svg_size(svg)
        w = intrinsic_w or default_w
        h = intrinsic_h or default_h or 400
        out_path = tmp_dir / f"{slug}-{vtype}.png"
        try:
            render_sync(svg, str(out_path), w, h)
        except Exception as e:
            failed.append(f"{vtype} (render: {e})")
            continue

        upload_url = upload_to_supabase(
            str(out_path), "visuals", f"{slug}-{vtype}.png",
        )
        if upload_url:
            regenerated.append(vtype)
        else:
            failed.append(f"{vtype} (upload failed)")

    # Mark the article as v3 AND rewrite visual image URLs in the body
    # with a fresh ?v=v3 query string so Next.js Image fetches fresh
    # (bumped from v2 because the timeline template changed shape).
    fm["visuals_generation"] = "v3"
    new_fm = yaml.safe_dump(
        fm, sort_keys=False, allow_unicode=True, width=4096, default_flow_style=False,
    )

    # Replace any visual URL (with or without an existing ?v= query)
    # with the canonical ?v=v3 version. The regex consumes the full URL
    # INCLUDING any trailing query string so we don't double-stack.
    visual_url_re = rf"https://[^\s)]*?/visuals/{re.escape(slug)}-[a-z_]+\.png(?:\?[^\s)]*)?"

    def _bust_visual_url(m: re.Match) -> str:
        url = m.group(0)
        # Strip any existing query string
        base = url.split("?", 1)[0]
        return f"{base}?v=v3"

    body = re.sub(visual_url_re, _bust_visual_url, body)

    filepath.write_text(f"{leading}---\n{new_fm}---{body}", encoding="utf-8")

    status = "ok" if not failed else "partial"
    print(
        f"  [{index}/{total}] {slug:55.55}  {status.upper()}  "
        f"regen={len(regenerated)} fail={len(failed)}"
    )
    if failed:
        for f in failed:
            print(f"      ! {f}")
    return {
        "slug": slug,
        "status": status,
        "regenerated": regenerated,
        "failed": failed,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Regenerate existing PNG visuals in published articles with the new templates.",
    )
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--slug", type=str, default=None)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not args.dry_run and (not url or not key):
        print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing")
        sys.exit(1)

    posts = sorted(POSTS_DIR.glob("*.md"))
    if args.slug:
        posts = [p for p in posts if args.slug in p.name]
    if args.limit is not None:
        posts = posts[: args.limit]

    if not posts:
        print("No articles match.")
        return

    print(f"\n{'='*70}")
    print(f"  VISUALS BACKFILL{'  (DRY RUN)' if args.dry_run else ''}")
    print(f"  Scanning {len(posts)} article(s)")
    print(f"{'='*70}\n")

    results = [
        process_article(p, dry_run=args.dry_run, force=args.force, index=i, total=len(posts))
        for i, p in enumerate(posts, start=1)
    ]

    by_status: dict[str, int] = {}
    for r in results:
        by_status[r.get("status", "unknown")] = by_status.get(r.get("status", "unknown"), 0) + 1

    print(f"\n{'-'*70}")
    for s, c in sorted(by_status.items()):
        print(f"  {s:15s}: {c}")
    print(f"{'-'*70}\n")

    hard_fails = [r for r in results if r.get("status") in ("error",)]
    if hard_fails:
        sys.exit(2)


if __name__ == "__main__":
    main()
