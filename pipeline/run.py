#!/usr/bin/env python3
"""
Particle Post Pipeline Entry Point

Usage:
    python -m pipeline.run --slot morning
    python -m pipeline.run --slot evening
    python -m pipeline.run --slot morning --dry-run   # skips file write, prints result
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Fix Windows console encoding for CrewAI emoji output
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Load .env from repo root
_REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_REPO_ROOT / ".env", override=True)

POSTS_DIR = _REPO_ROOT / "blog" / "content" / "posts"
HISTORY_FILE = _REPO_ROOT / "blog" / "data" / "topics_history.json"


def _check_env() -> list[str]:
    required = ["ANTHROPIC_API_KEY", "TAVILY_API_KEY"]
    return [var for var in required if not os.environ.get(var)]


def _extract_frontmatter_field(content: str, field: str) -> str:
    """Extract a scalar field value from YAML frontmatter."""
    pattern = rf'^{field}:\s*["\']?([^"\'\n]+)["\']?'
    match = re.search(pattern, content, re.MULTILINE)
    return match.group(1).strip() if match else ""


def _extract_frontmatter_list(content: str, field: str) -> list[str]:
    """Extract a list field from YAML frontmatter (- item style)."""
    # Find the field block
    pattern = rf'^{field}:\s*\n((?:[ \t]+-[^\n]+\n?)+)'
    match = re.search(pattern, content, re.MULTILINE)
    if not match:
        return []
    items = re.findall(r'-\s*["\']?([^"\'\n]+)["\']?', match.group(1))
    return [i.strip() for i in items]


def _write_post(content: str, dry_run: bool) -> None:
    """Extract metadata from frontmatter and write the post to disk."""
    slug = _extract_frontmatter_field(content, "slug")
    title = _extract_frontmatter_field(content, "title")
    tags = _extract_frontmatter_list(content, "tags")

    if not slug:
        # Fallback: derive slug from title or use timestamp
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") if title else "post"

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"{date_str}-{slug}.md"
    post_path = POSTS_DIR / filename

    if dry_run:
        print(f"\n[DRY RUN] Would write: {post_path}")
        print(f"  Title : {title}")
        print(f"  Slug  : {slug}")
        print(f"  Tags  : {tags}")
        print(f"\nContent preview (first 400 chars):\n{content[:400]}\n")
        return

    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    post_path.write_text(content, encoding="utf-8")
    print(f"\n✅ Post written to: {post_path}")

    # Update topics history
    _update_history(title=title, slug=slug, tags=tags, filename=filename)


def _update_history(title: str, slug: str, tags: list, filename: str) -> None:
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    if HISTORY_FILE.exists():
        try:
            history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            history = {"posts": []}
    else:
        history = {"posts": []}

    history["posts"].append({
        "title": title,
        "slug": slug,
        "tags": tags,
        "filename": filename,
        "published_at": datetime.now(timezone.utc).isoformat(),
    })
    history["posts"] = history["posts"][-60:]
    HISTORY_FILE.write_text(json.dumps(history, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"📋 History updated ({len(history['posts'])} entries).")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Particle Post publishing pipeline.")
    parser.add_argument("--slot", choices=["morning", "evening"], required=True)
    parser.add_argument("--dry-run", action="store_true",
                        help="Run the full pipeline but skip writing the file to disk.")
    args = parser.parse_args()

    missing = _check_env()
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — {args.slot.upper()} PIPELINE")
    print(f"{'='*60}\n")

    from pipeline.crew import build_crew
    crew = build_crew(slot=args.slot)
    result = crew.kickoff()

    # The Formatter (last task) outputs the complete Hugo markdown.
    # Extract it from tasks_output and write to disk via Python — no LLM tool call needed.
    formatter_output = result.tasks_output[-1].raw if result.tasks_output else str(result)

    # Strip any accidental code fences the LLM may have wrapped it in
    if formatter_output.strip().startswith("```"):
        formatter_output = re.sub(r"^```[^\n]*\n?", "", formatter_output.strip())
        formatter_output = re.sub(r"\n?```$", "", formatter_output.strip())

    print(f"\n{'='*60}")
    print("  PIPELINE COMPLETE — WRITING POST")
    print(f"{'='*60}")

    _write_post(content=formatter_output, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
