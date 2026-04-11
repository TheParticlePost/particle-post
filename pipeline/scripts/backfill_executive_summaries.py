#!/usr/bin/env python3
"""
backfill_executive_summaries.py — Generate the `executive_summary` frontmatter
field for every published article that doesn't already have one.

Usage:
    python -m pipeline.scripts.backfill_executive_summaries                # apply
    python -m pipeline.scripts.backfill_executive_summaries --dry-run      # preview only
    python -m pipeline.scripts.backfill_executive_summaries --limit 5      # only process first 5

Reads each article in blog/content/posts/, calls Claude with a constrained
prompt to extract a 50-75 word executive summary, and writes the result
back to the YAML frontmatter as `executive_summary: "..."`.

Idempotent — articles that already have an executive_summary field are
skipped. Run cost: roughly $0.50 in Claude tokens for the full 39-article
backfill.

Mirrors the structure of pipeline/scripts/backfill_authors.py — same
frontmatter regex, same dry-run/limit conventions.

Required env vars:
    ANTHROPIC_API_KEY
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

try:
    import anthropic  # type: ignore
except ImportError:
    print(
        "ERROR: anthropic SDK not installed. Run `pip install anthropic`",
        file=sys.stderr,
    )
    sys.exit(1)

import yaml  # type: ignore


POSTS_DIR = Path(__file__).resolve().parents[2] / "blog" / "content" / "posts"

# Same regex as backfill_authors.py
FRONTMATTER_RE = re.compile(
    r"\A---\s*\n(.*?)\n---\s*\n",
    re.DOTALL,
)

EXTRACTION_PROMPT = """Read the following published article and produce an \
"In brief" executive summary.

Constraints:
- 50-75 words. Count before submitting. Under 50 or over 75 is a hard reject.
- One paragraph. No markdown formatting. No bullets, no headings, no quotes.
- A complete verdict, not a teaser. State what happened, why it matters, and
  what the executive should do or expect.
- If the article has a contrarian or surprising conclusion, lead with that.
- If the article cites a single defining number, include it (with the source).
- Do NOT mention "this article" or "the author" or "Particle Post" — write as
  if it's a news brief, not a meta-comment.
- Plain text output ONLY. No surrounding quotes, no preamble like "Summary:".

ARTICLE TITLE: {title}

ARTICLE BODY:
{body}

Output the executive summary text only, nothing else.
"""


def parse_frontmatter(text: str) -> tuple[dict, str]:
    """Return (parsed_yaml, body). Empty dict + full text if no frontmatter."""
    m = FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        meta = {}
    body = text[m.end():]
    return meta, body


def call_claude(client: "anthropic.Anthropic", title: str, body: str) -> str:
    """Ask Claude for an executive summary. Returns the cleaned text."""
    # Cap body to ~6000 chars to keep token cost predictable. The first
    # 6000 chars of any article contain the lede, key takeaway, and at
    # least one full section — enough for a verdict.
    excerpt = body[:6000]

    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=300,
        messages=[
            {
                "role": "user",
                "content": EXTRACTION_PROMPT.format(title=title, body=excerpt),
            }
        ],
    )

    raw = "".join(
        block.text for block in response.content if hasattr(block, "text")
    ).strip()

    # Strip surrounding quotes if Claude adds them despite instructions
    if raw.startswith('"') and raw.endswith('"'):
        raw = raw[1:-1].strip()
    if raw.startswith("'") and raw.endswith("'"):
        raw = raw[1:-1].strip()

    # Collapse internal whitespace
    raw = re.sub(r"\s+", " ", raw)
    return raw


def insert_executive_summary(text: str, summary: str) -> str:
    """Splice an `executive_summary: "..."` line into the YAML frontmatter
    just after the `description:` line. Mirrors the style used by
    backfill_authors.py:update_author_in_text — string-level edit so we
    don't disturb other fields, key order, or quoting style."""
    m = FRONTMATTER_RE.match(text)
    if not m:
        return text

    block = m.group(1)
    block_start, block_end = m.span(1)

    # Escape any double quotes in the summary for YAML.
    safe = summary.replace("\\", "\\\\").replace('"', '\\"')
    new_line = f'executive_summary: "{safe}"'

    # If the field already exists, replace it in place.
    field_re = re.compile(r"^executive_summary:\s*.*$", re.MULTILINE)
    if field_re.search(block):
        new_block = field_re.sub(new_line, block, count=1)
    else:
        # Insert after `description:` line if present, else after `slug:`,
        # else at the end of the block.
        insert_after = re.compile(
            r"^(description:.*$|slug:.*$|date:.*$)", re.MULTILINE
        )
        last_match = None
        for match in insert_after.finditer(block):
            last_match = match
        if last_match:
            insert_pos = last_match.end()
            new_block = block[:insert_pos] + "\n" + new_line + block[insert_pos:]
        else:
            new_block = block + "\n" + new_line

    return text[:block_start] + new_block + text[block_end:]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without writing files or calling Claude",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Process at most N articles (useful for incremental runs)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if executive_summary already exists",
    )
    args = parser.parse_args()

    if not POSTS_DIR.exists():
        print(f"ERROR: posts directory not found: {POSTS_DIR}", file=sys.stderr)
        return 1

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key and not args.dry_run:
        print(
            "ERROR: ANTHROPIC_API_KEY not set. Use --dry-run for a no-op preview.",
            file=sys.stderr,
        )
        return 1

    client = anthropic.Anthropic(api_key=api_key) if api_key else None

    md_files = sorted(POSTS_DIR.glob("*.md"))
    if not md_files:
        print(f"No .md files in {POSTS_DIR}")
        return 0

    processed = 0
    skipped = 0
    failed = 0

    for path in md_files:
        if args.limit is not None and processed >= args.limit:
            break

        text = path.read_text(encoding="utf-8")
        meta, body = parse_frontmatter(text)

        if not meta:
            print(f"  [SKIP] {path.name}: no frontmatter")
            skipped += 1
            continue

        existing = meta.get("executive_summary")
        if existing and not args.force:
            skipped += 1
            continue

        title = str(meta.get("title", path.stem))

        if args.dry_run:
            print(f"  [DRY-RUN] {path.name}: would generate executive summary")
            processed += 1
            continue

        try:
            summary = call_claude(client, title, body)  # type: ignore[arg-type]
        except Exception as exc:
            print(f"  [FAIL] {path.name}: {exc}")
            failed += 1
            continue

        word_count = len(summary.split())
        if word_count < 40 or word_count > 90:
            print(
                f"  [WARN] {path.name}: summary {word_count} words "
                f"(target 50-75) — keeping anyway"
            )

        new_text = insert_executive_summary(text, summary)
        path.write_text(new_text, encoding="utf-8")

        print(f"  [OK]   {path.name}: {word_count}w  {summary[:90]}...")
        processed += 1

    action = "would process" if args.dry_run else "processed"
    print(
        f"\nDone. {action} {processed} file(s); skipped {skipped}; failed {failed}."
    )
    return 0 if failed == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
