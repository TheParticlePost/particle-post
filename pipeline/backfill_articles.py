"""
Backfill existing articles to match Content Strategy v4.0.

For each article:
1. Classify into content type (news_analysis, deep_dive, case_study, how_to, technology_profile)
2. Fix schema_type based on content type
3. Add content_type field to frontmatter
4. Optionally generate branded cover image

Usage:
    python -m pipeline.backfill_articles              # Process all articles
    python -m pipeline.backfill_articles --dry-run     # Preview changes only
    python -m pipeline.backfill_articles --slug fraud   # Single article matching slug
"""

import argparse
import json
import re
import sys
from pathlib import Path

POSTS_DIR = Path(__file__).parent.parent / "blog" / "content" / "posts"


def classify_article(title: str, word_count: int, body: str) -> str:
    """Classify article into content type based on title, word count, and structure."""
    title_lower = title.lower()

    # How-To: step-by-step, implementation, playbook, framework, deployment guide
    how_to_keywords = [
        "how to", "step", "playbook", "implementation guide", "framework",
        "deployment", "checklist", "go/no-go", "prerequisites",
    ]
    if any(kw in title_lower for kw in how_to_keywords) and word_count > 1000:
        return "how_to"

    # Case Study: company name + outcome verb
    if re.search(r'(how|what)\s+\w+\s+(cut|saved|reduced|achieved|deployed|proves?)', title_lower):
        return "case_study"
    if re.search(r'(oracle|jpmorgan|visa|mastercard|zalos|barclays|meta)\b', title_lower):
        if "vs" in title_lower or "compared" in title_lower:
            return "technology_profile"
        return "case_study"

    # Technology Profile: comparison, vs, assessment, landscape
    if any(kw in title_lower for kw in ["compared", " vs ", "vs.", "landscape", "assessment", "which fits"]):
        return "technology_profile"
    if "open vs proprietary" in title_lower or "what .* needs to know" in title_lower:
        return "technology_profile"

    # Deep Dive: long analytical piece
    if word_count > 2000:
        return "deep_dive"

    # Default: News Analysis
    return "news_analysis"


SCHEMA_MAP = {
    "news_analysis": "NewsArticle",
    "deep_dive": "Article",
    "case_study": "Article",
    "how_to": "HowTo",
    "technology_profile": "Article",
    "industry_briefing": "NewsArticle",
}


def process_article(filepath: Path, dry_run: bool = False) -> dict:
    """Process a single article: classify, fix schema, add content_type."""
    content = filepath.read_text(encoding="utf-8")

    # Parse frontmatter boundaries
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {"file": filepath.name, "status": "skipped", "reason": "no frontmatter"}

    frontmatter = parts[1]
    body = parts[2]

    # Extract fields
    title_match = re.search(r'^title:\s*"?([^"\n]+)"?', frontmatter, re.MULTILINE)
    title = title_match.group(1) if title_match else "Unknown"
    slug_match = re.search(r'^slug:\s*"?([^"\n]+)"?', frontmatter, re.MULTILINE)
    slug = slug_match.group(1) if slug_match else filepath.stem

    word_count = len(body.split())

    # 1. Classify
    content_type = classify_article(title, word_count, body)
    schema_type = SCHEMA_MAP.get(content_type, "Article")

    if dry_run:
        return {
            "file": filepath.name,
            "title": title[:60],
            "words": word_count,
            "content_type": content_type,
            "schema_type": schema_type,
            "status": "preview",
        }

    # 2. Update frontmatter
    updated = False

    # Add content_type if missing
    if "content_type:" not in frontmatter:
        frontmatter += f'\ncontent_type: "{content_type}"'
        updated = True
    else:
        frontmatter = re.sub(
            r'^content_type:\s*"?[^"\n]+"?',
            f'content_type: "{content_type}"',
            frontmatter, flags=re.MULTILINE,
        )
        updated = True

    # Fix schema_type
    if re.search(r'^schema_type:', frontmatter, re.MULTILINE):
        old = re.search(r'^schema_type:\s*"?([^"\n]+)"?', frontmatter, re.MULTILINE)
        old_val = old.group(1) if old else ""
        if old_val != schema_type:
            frontmatter = re.sub(
                r'^schema_type:\s*"?[^"\n]+"?',
                f'schema_type: "{schema_type}"',
                frontmatter, flags=re.MULTILINE,
            )
            updated = True
    else:
        frontmatter += f'\nschema_type: "{schema_type}"'
        updated = True

    if updated:
        filepath.write_text(f"---{frontmatter}\n---{body}", encoding="utf-8")

    return {
        "file": filepath.name,
        "title": title[:60],
        "words": word_count,
        "content_type": content_type,
        "schema_type": schema_type,
        "status": "updated" if updated else "unchanged",
    }


def main():
    parser = argparse.ArgumentParser(description="Backfill articles with content type and schema.")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing")
    parser.add_argument("--slug", type=str, default=None, help="Process only articles matching this slug")
    args = parser.parse_args()

    if not POSTS_DIR.exists():
        print(f"ERROR: Posts directory not found: {POSTS_DIR}")
        sys.exit(1)

    posts = sorted(POSTS_DIR.glob("*.md"))
    if args.slug:
        posts = [p for p in posts if args.slug in p.name]

    if not posts:
        print("No articles found to process.")
        return

    print(f"\n{'='*60}")
    print(f"  ARTICLE BACKFILL {'(DRY RUN)' if args.dry_run else ''}")
    print(f"  Processing {len(posts)} articles")
    print(f"{'='*60}\n")

    results = []
    for post in posts:
        result = process_article(post, dry_run=args.dry_run)
        results.append(result)
        status_icon = "+" if result["status"] == "updated" else "=" if result["status"] == "unchanged" else "~"
        print(f"  {status_icon} {result.get('content_type', '?'):20s} | {result.get('schema_type', '?'):15s} | {result.get('title', result['file'])}")

    # Summary
    types: dict[str, int] = {}
    schemas: dict[str, int] = {}
    for r in results:
        t = r.get("content_type", "unknown")
        s = r.get("schema_type", "unknown")
        types[t] = types.get(t, 0) + 1
        schemas[s] = schemas.get(s, 0) + 1

    print(f"\n{'-'*60}")
    print(f"Content Type Distribution:")
    for t, c in sorted(types.items()):
        print(f"  {t:20s}: {c}")
    print(f"\nSchema Distribution:")
    for s, c in sorted(schemas.items()):
        print(f"  {s:20s}: {c}")
    print(f"\nTotal: {len(results)} articles processed")


if __name__ == "__main__":
    main()
