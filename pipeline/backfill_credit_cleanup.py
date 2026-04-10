"""
Backfill: remove all "AI generated" photo credit fields from published
article frontmatter. The ImageCredit React component now also filters
these defensively, but stripping them from the source markdown is
cleaner and prevents drift.

For each article:
  1. Parse frontmatter with pyyaml
  2. Remove cover.credit_source / cover.credit_name / cover.credit_url
     when credit_source matches the AI pattern
  3. Remove top-level image_credit_source / image_credit_name /
     image_credit_url when image_credit_source matches the AI pattern
  4. Write the file back

Usage:
    python -m pipeline.backfill_credit_cleanup              # live
    python -m pipeline.backfill_credit_cleanup --dry-run    # preview
    python -m pipeline.backfill_credit_cleanup --slug foo   # filter
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

import yaml

PROJECT_ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = PROJECT_ROOT / "blog" / "content" / "posts"

# Matches any credit_source value that indicates the image was AI-generated.
AI_SOURCE_RE = re.compile(r"^(ai-|generated|gemini|higgsfield)", re.IGNORECASE)


def split_frontmatter(text: str) -> tuple[str, str, str]:
    if not text.startswith("---"):
        raise ValueError("no frontmatter")
    parts = text.split("---", 2)
    if len(parts) < 3:
        raise ValueError("malformed frontmatter")
    return parts[0], parts[1], parts[2]


def scrub(fm: dict[str, Any]) -> bool:
    """Mutate fm in place, remove AI credit fields. Return True if any change."""
    changed = False

    cover = fm.get("cover")
    if isinstance(cover, dict):
        cover_source = cover.get("credit_source", "")
        if isinstance(cover_source, str) and AI_SOURCE_RE.match(cover_source):
            for k in ("credit_source", "credit_name", "credit_url"):
                if k in cover:
                    cover.pop(k)
                    changed = True

    top_source = fm.get("image_credit_source", "")
    if isinstance(top_source, str) and AI_SOURCE_RE.match(top_source):
        for k in ("image_credit_source", "image_credit_name", "image_credit_url"):
            if k in fm:
                fm.pop(k)
                changed = True

    return changed


def process_article(filepath: Path, *, dry_run: bool) -> dict[str, Any]:
    text = filepath.read_text(encoding="utf-8")
    try:
        leading, fm_text, body = split_frontmatter(text)
    except ValueError as e:
        return {"file": filepath.name, "status": "error", "reason": str(e)}

    fm = yaml.safe_load(fm_text) or {}
    if not isinstance(fm, dict):
        return {"file": filepath.name, "status": "error", "reason": "fm not mapping"}

    changed = scrub(fm)
    if not changed:
        return {"file": filepath.name, "status": "clean"}

    if dry_run:
        return {"file": filepath.name, "status": "would-update"}

    new_fm = yaml.safe_dump(
        fm, sort_keys=False, allow_unicode=True, width=4096, default_flow_style=False,
    )
    filepath.write_text(f"{leading}---\n{new_fm}---{body}", encoding="utf-8")
    return {"file": filepath.name, "status": "updated"}


def main():
    parser = argparse.ArgumentParser(description="Strip AI-generated photo credits from article frontmatter.")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--slug", type=str, default=None)
    args = parser.parse_args()

    if not POSTS_DIR.exists():
        print(f"ERROR: {POSTS_DIR} not found")
        sys.exit(1)

    posts = sorted(POSTS_DIR.glob("*.md"))
    if args.slug:
        posts = [p for p in posts if args.slug in p.name]

    print(f"\n{'='*70}")
    print(f"  CREDIT CLEANUP{'  (DRY RUN)' if args.dry_run else ''}")
    print(f"  Scanning {len(posts)} article(s)")
    print(f"{'='*70}\n")

    results = [process_article(p, dry_run=args.dry_run) for p in posts]

    by_status: dict[str, int] = {}
    for r in results:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1

    for s in ("updated", "would-update", "clean", "error"):
        if s in by_status:
            print(f"  {s:14s}: {by_status[s]}")

    for r in results:
        if r["status"] == "updated":
            print(f"    + {r['file']}")

    errors = [r for r in results if r["status"] == "error"]
    if errors:
        print("\nErrors:")
        for r in errors:
            print(f"  ! {r['file']}: {r.get('reason','')}")
        sys.exit(2)


if __name__ == "__main__":
    main()
