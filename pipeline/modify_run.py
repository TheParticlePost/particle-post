#!/usr/bin/env python3
"""
Particle Post — Article Modification Pipeline

Re-runs specific pipeline stages on already-published articles.

Usage:
    python -m pipeline.modify_run --fix-images blog/content/posts/2026-03-25-*.md
    python -m pipeline.modify_run --fix-links blog/content/posts/*.md
    python -m pipeline.modify_run --fix-style blog/content/posts/2026-03-25-article.md
    python -m pipeline.modify_run --fix-all blog/content/posts/*.md
"""

import argparse
import glob
import json
import os
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

POSTS_DIR = Path(__file__).resolve().parent.parent / "blog" / "content" / "posts"


def _parse_frontmatter(content: str) -> tuple[dict, str]:
    """Split markdown into frontmatter dict and body text."""
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    import yaml
    fm = yaml.safe_load(parts[1]) or {}
    body = parts[2].lstrip("\n")
    return fm, body


def _rebuild_file(fm: dict, body: str) -> str:
    """Reconstruct markdown file from frontmatter dict and body."""
    import yaml
    fm_str = yaml.dump(fm, default_flow_style=False, allow_unicode=True, sort_keys=False)
    return f"---\n{fm_str}---\n{body}"


def fix_images(file_path: Path) -> bool:
    """Re-fetch cover image from Pexels API based on article title."""
    from urllib.request import urlopen, Request
    from urllib.parse import urlencode

    api_key = os.environ.get("PEXELS_API_KEY", "")
    if not api_key:
        print(f"  SKIP {file_path.name}: PEXELS_API_KEY not set")
        return False

    content = file_path.read_text(encoding="utf-8")
    fm, body = _parse_frontmatter(content)
    title = fm.get("title", "")

    # Build search query from title keywords
    stop_words = {"the", "a", "an", "is", "are", "was", "were", "and", "or", "but",
                  "in", "on", "at", "to", "for", "of", "with", "by", "from", "not",
                  "how", "what", "why", "when", "where", "can", "do", "does", "your",
                  "its", "it", "this", "that", "these", "those"}
    words = [w for w in re.sub(r"[^a-zA-Z\s]", "", title).lower().split() if w not in stop_words]
    query = " ".join(words[:4])

    params = urlencode({"query": query, "orientation": "landscape", "per_page": 3})
    url = f"https://api.pexels.com/v1/search?{params}"
    req = Request(url, headers={"Authorization": api_key})

    try:
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        photos = data.get("photos", [])
        if not photos:
            print(f"  SKIP {file_path.name}: no Pexels results for '{query}'")
            return False
        photo = photos[0]
        new_url = photo["src"]["landscape"]
        photographer = photo["photographer"]
        photographer_url = photo["photographer_url"]

        # Update frontmatter
        if "cover" not in fm:
            fm["cover"] = {}
        fm["cover"]["image"] = new_url
        fm["image_credit_name"] = photographer
        fm["image_credit_url"] = photographer_url
        fm["image_credit_source"] = "Pexels"

        file_path.write_text(_rebuild_file(fm, body), encoding="utf-8")
        print(f"  FIXED {file_path.name}: new image from {photographer}")
        return True
    except Exception as e:
        print(f"  ERROR {file_path.name}: {e}")
        return False


def fix_links(file_path: Path) -> bool:
    """Validate and repair internal links in article content."""
    content = file_path.read_text(encoding="utf-8")
    changed = False

    # Find all internal links: [text](/posts/slug/) or [text](/posts/date-slug/)
    existing_slugs = {p.stem.split("-", 3)[-1] if p.stem.count("-") >= 3 else p.stem
                      for p in POSTS_DIR.glob("*.md")}

    # Fix example.com placeholder links
    pattern = r'\[([^\]]+)\]\(https?://example\.com/([^)]+)\)'
    def replace_example(m):
        nonlocal changed
        text, slug = m.group(1), m.group(2)
        changed = True
        return f"[{text}](/posts/{slug}/)"
    content = re.sub(pattern, replace_example, content)

    # Check internal links for broken targets
    link_pattern = r'\[([^\]]+)\]\(/posts/([^/)]+)/?\)'
    for m in re.finditer(link_pattern, content):
        text, slug = m.group(1), m.group(2)
        # Check if slug exists (with or without date prefix)
        slug_base = slug.split("-", 3)[-1] if slug.count("-") >= 3 and slug[:4].isdigit() else slug
        if slug not in existing_slugs and slug_base not in existing_slugs:
            # Check full filename match
            matches = list(POSTS_DIR.glob(f"*{slug}*.md"))
            if not matches:
                print(f"  WARN {file_path.name}: broken link to /posts/{slug}/ - removing link")
                content = content.replace(f"[{text}](/posts/{slug}/)", text)
                changed = True

    if changed:
        file_path.write_text(content, encoding="utf-8")
        print(f"  FIXED {file_path.name}: links repaired")
    return changed


def fix_sources(file_path: Path) -> bool:
    """Standardize the ## Sources section to numbered format with source name + URL."""
    content = file_path.read_text(encoding="utf-8")

    # Find the ## Sources section
    sources_match = re.search(r'^## Sources\s*\n', content, re.MULTILINE)
    if not sources_match:
        print(f"  SKIP {file_path.name}: no ## Sources section found")
        return False

    before = content[:sources_match.start()]
    sources_block = content[sources_match.end():]

    # Parse existing entries (handle numbered, bulleted, and plain lines)
    entries = []
    for line in sources_block.strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        # Strip leading number or bullet
        cleaned = re.sub(r'^(\d+\.\s*|-\s*|\*\s*)', '', line).strip()
        if not cleaned:
            continue
        entries.append(cleaned)

    if not entries:
        print(f"  SKIP {file_path.name}: no source entries found")
        return False

    # Reformat each entry to standard: Source Name, "Title." URL
    formatted = []
    for i, entry in enumerate(entries, 1):
        # Extract URL if present
        url_match = re.search(r'(https?://\S+)', entry)
        url = url_match.group(1).rstrip('.,;') if url_match else ""
        text_part = entry[:url_match.start()].rstrip(' :,\t') if url_match else entry.rstrip('.')

        # Clean up text part: remove trailing periods, colons
        text_part = text_part.strip().rstrip(':').strip()

        if not text_part and url:
            # Bare URL only — try to extract domain as source name
            from urllib.parse import urlparse
            domain = urlparse(url).netloc.replace('www.', '')
            formatted.append(f"{i}. {domain}. {url}")
        elif text_part and url:
            # Has both text and URL
            # Check if already has quotes
            if '"' not in text_part and "'" not in text_part:
                # Try to split "Source, Title" pattern
                comma_idx = text_part.find(',')
                if comma_idx > 0 and comma_idx < len(text_part) - 2:
                    source = text_part[:comma_idx].strip()
                    title = text_part[comma_idx+1:].strip().rstrip('.')
                    formatted.append(f'{i}. {source}, "{title}." {url}')
                else:
                    formatted.append(f'{i}. {text_part.rstrip(".")}. {url}')
            else:
                # Already has quotes, just ensure numbering and URL placement
                if not text_part.endswith('.'):
                    text_part = text_part.rstrip('.') + '.'
                formatted.append(f'{i}. {text_part} {url}')
        else:
            # No URL
            if '"' not in text_part and "'" not in text_part:
                comma_idx = text_part.find(',')
                if comma_idx > 0 and comma_idx < len(text_part) - 2:
                    source = text_part[:comma_idx].strip()
                    title = text_part[comma_idx+1:].strip().rstrip('.')
                    formatted.append(f'{i}. {source}, "{title}."')
                else:
                    formatted.append(f'{i}. {text_part.rstrip(".")}.')
            else:
                if not text_part.endswith('.'):
                    text_part = text_part.rstrip('.') + '.'
                formatted.append(f'{i}. {text_part}')

    # Clean up double periods from academic-style entries
    formatted = [re.sub(r'\."\.\s', '." ', entry) for entry in formatted]
    formatted = [re.sub(r'\."\.($)', '."', entry) for entry in formatted]

    new_sources = "## Sources\n\n" + "\n".join(formatted) + "\n"
    new_content = before + new_sources

    if new_content != content:
        file_path.write_text(new_content, encoding="utf-8")
        print(f"  FIXED {file_path.name}: standardized {len(formatted)} source entries")
        return True
    else:
        print(f"  OK {file_path.name}: sources already standardized")
        return False


def fix_style(file_path: Path) -> bool:
    """Remove em-dashes and other style issues."""
    content = file_path.read_text(encoding="utf-8")
    original = content

    # Replace em-dashes with appropriate punctuation
    # Simple heuristic: replace " --- " with ", " as most common case
    content = content.replace(" \u2014 ", ", ")
    # Handle em-dashes without spaces (rare)
    content = content.replace("\u2014", ", ")

    if content != original:
        file_path.write_text(content, encoding="utf-8")
        count = original.count("\u2014")
        print(f"  FIXED {file_path.name}: removed {count} em-dashes")
        return True
    else:
        print(f"  OK {file_path.name}: no em-dashes found")
        return False


def main():
    parser = argparse.ArgumentParser(description="Particle Post Article Modifier")
    parser.add_argument("files", nargs="+", help="Article file paths (glob patterns supported)")
    parser.add_argument("--fix-images", action="store_true", help="Re-fetch cover images from Pexels")
    parser.add_argument("--fix-links", action="store_true", help="Validate and repair internal links")
    parser.add_argument("--fix-style", action="store_true", help="Remove em-dashes and style issues")
    parser.add_argument("--fix-sources", action="store_true", help="Standardize ## Sources format")
    parser.add_argument("--fix-all", action="store_true", help="Run all fixes")
    args = parser.parse_args()

    if args.fix_all:
        args.fix_images = args.fix_links = args.fix_style = args.fix_sources = True

    if not (args.fix_images or args.fix_links or args.fix_style or args.fix_sources):
        parser.error("Specify at least one fix mode: --fix-images, --fix-links, --fix-style, or --fix-all")

    # Expand glob patterns
    file_paths = []
    for pattern in args.files:
        expanded = glob.glob(pattern)
        if expanded:
            file_paths.extend(Path(f) for f in expanded)
        else:
            file_paths.append(Path(pattern))

    file_paths = [f for f in file_paths if f.exists() and f.suffix == ".md"]
    if not file_paths:
        print("No .md files found matching the given patterns.")
        sys.exit(1)

    print(f"Processing {len(file_paths)} article(s)...\n")
    total_fixed = 0

    for fp in sorted(file_paths):
        print(f"[{fp.name}]")
        if args.fix_images:
            total_fixed += fix_images(fp)
        if args.fix_links:
            total_fixed += fix_links(fp)
        if args.fix_style:
            total_fixed += fix_style(fp)
        if args.fix_sources:
            total_fixed += fix_sources(fp)
        print()

    print(f"Done. {total_fixed} fix(es) applied across {len(file_paths)} file(s).")


if __name__ == "__main__":
    main()
