#!/usr/bin/env python3
"""
backfill_authors.py — Set the `author` frontmatter field on every published
article to the curator slug from lib/authors.ts, deterministically by
content_type.

Usage:
    python -m pipeline.scripts.backfill_authors                # apply
    python -m pipeline.scripts.backfill_authors --dry-run      # preview only

The mapping mirrors the `defaultFor` rules in lib/authors.ts. Keep these in
sync — if you add a new content_type or curator, update both.

Uses PyYAML directly (no python-frontmatter dependency) because we want to
preserve the file's exact YAML formatting (key order, comments, quoted vs
bare strings) as much as possible. We do a string-level replacement on the
`author:` line if it exists, otherwise inject it after the existing
`content_type:` or `tags:` line.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import yaml  # type: ignore


# Mirrors lib/authors.ts:AUTHORS[*].defaultFor
CONTENT_TYPE_TO_AUTHOR: dict[str, str] = {
    "news_analysis": "william-morin",
    "industry_briefing": "william-morin",
    "deep_dive": "marie-tremblay",
    "case_study": "marie-tremblay",
    "how_to": "alex-park",
    "technology_profile": "alex-park",
}

# Default fallback when content_type is missing or unrecognised
DEFAULT_AUTHOR = "william-morin"

POSTS_DIR = Path(__file__).resolve().parents[2] / "blog" / "content" / "posts"

# Matches a YAML frontmatter block at the very top of the file:
#   ---
#   key: value
#   ...
#   ---
FRONTMATTER_RE = re.compile(
    r"\A---\s*\n(.*?)\n---\s*\n",
    re.DOTALL,
)


def assign_author(content_type: str | None) -> str:
    if content_type is None:
        return DEFAULT_AUTHOR
    return CONTENT_TYPE_TO_AUTHOR.get(content_type, DEFAULT_AUTHOR)


def update_author_in_text(text: str, new_author: str) -> tuple[str, str | None]:
    """Return (new_text, old_author_value | None).

    If author exists in frontmatter: rewrite the value in place.
    If not: insert `author: "<new>"` after the `content_type:` line, or
    after `tags:` if no content_type, or as the second line of the
    frontmatter as a last resort.
    """
    match = FRONTMATTER_RE.match(text)
    if not match:
        return text, None

    block = match.group(1)
    block_start, block_end = match.span(1)

    # Parse frontmatter to read the current author value (just for reporting)
    try:
        parsed = yaml.safe_load(block) or {}
    except yaml.YAMLError:
        parsed = {}
    old_author = parsed.get("author")

    # Replace existing `author: ...` line
    line_re = re.compile(r"^author:\s*.*$", re.MULTILINE)
    if line_re.search(block):
        new_block = line_re.sub(f'author: "{new_author}"', block, count=1)
    else:
        # Insert after content_type:, else after tags:, else at top
        insert_after = re.compile(
            r"^(content_type:.*$|tags:.*$|date:.*$)", re.MULTILINE
        )
        m = insert_after.search(block)
        if m:
            insert_pos = m.end()
            new_block = (
                block[:insert_pos]
                + f'\nauthor: "{new_author}"'
                + block[insert_pos:]
            )
        else:
            new_block = f'author: "{new_author}"\n' + block

    new_text = text[:block_start] + new_block + text[block_end:]
    return new_text, str(old_author) if old_author is not None else None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would change without writing files",
    )
    args = parser.parse_args()

    if not POSTS_DIR.exists():
        print(f"ERROR: posts directory not found: {POSTS_DIR}", file=sys.stderr)
        return 1

    md_files = sorted(POSTS_DIR.glob("*.md"))
    if not md_files:
        print(f"No .md files in {POSTS_DIR}")
        return 0

    changed = 0
    unchanged = 0
    for path in md_files:
        text = path.read_text(encoding="utf-8")

        match = FRONTMATTER_RE.match(text)
        if not match:
            print(f"  [SKIP] {path.name}: no frontmatter block found")
            continue

        try:
            parsed = yaml.safe_load(match.group(1)) or {}
        except yaml.YAMLError as e:
            print(f"  [SKIP] {path.name}: yaml parse error: {e}")
            continue

        content_type = parsed.get("content_type")
        new_author = assign_author(content_type)
        current_author = parsed.get("author")

        if current_author == new_author:
            unchanged += 1
            continue

        action = "DRY-RUN" if args.dry_run else "UPDATE"
        print(
            f"  [{action}] {path.name}: "
            f"author='{current_author}' -> '{new_author}' (content_type={content_type})"
        )

        if not args.dry_run:
            new_text, _ = update_author_in_text(text, new_author)
            path.write_text(new_text, encoding="utf-8")

        changed += 1

    summary_action = "would change" if args.dry_run else "changed"
    print(
        f"\nDone. {summary_action} {changed} file(s); {unchanged} already correct."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
