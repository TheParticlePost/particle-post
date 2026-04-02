"""
Affiliate Link Inserter — Post-processing tool for the pipeline.

Scans article body for keyword matches and replaces the first N occurrences
with affiliate links. Respects max_insertions_per_article per keyword.

Usage in pipeline:
    from pipeline.tools.affiliate_inserter import insert_affiliate_links
    content = insert_affiliate_links(content)
"""

import json
import os
import re
from pathlib import Path

# Local cache file for affiliate links (avoids Supabase dependency in CI)
_CACHE_FILE = Path(__file__).resolve().parent.parent / "config" / "affiliate_links.json"


def _load_affiliate_links() -> list[dict]:
    """Load active affiliate links from local cache or Supabase.

    Priority:
    1. Local JSON cache (pipeline/config/affiliate_links.json)
    2. Supabase (if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set)

    The cache file is synced by a separate process or can be manually updated.
    """
    # Try local cache first
    if _CACHE_FILE.exists():
        try:
            data = json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
            links = data.get("links", [])
            if links:
                return [l for l in links if l.get("active", True)]
        except (json.JSONDecodeError, KeyError):
            pass

    # Try Supabase
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        try:
            from urllib.request import Request, urlopen

            req = Request(
                f"{url}/rest/v1/affiliate_links?active=eq.true&select=keyword,url,product_name,max_insertions_per_article",
                headers={
                    "apikey": key,
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json",
                },
            )
            resp = urlopen(req, timeout=10)
            return json.loads(resp.read().decode("utf-8"))
        except Exception as exc:
            print(f"  [Affiliate] Supabase fetch failed: {exc}")

    return []


def insert_affiliate_links(content: str) -> str:
    """Insert affiliate links into article markdown content.

    Rules:
    - Only replaces keywords in the body (after frontmatter)
    - Skips keywords already inside markdown links [text](url)
    - Skips keywords inside headings (# lines)
    - Skips keywords inside code blocks
    - Adds rel="sponsored" attribute
    - Respects max_insertions_per_article per keyword
    """
    links = _load_affiliate_links()
    if not links:
        return content

    # Split content into frontmatter and body
    parts = content.split("---", 2)
    if len(parts) < 3:
        return content

    frontmatter = f"---{parts[1]}---"
    body = parts[2]

    insertions = 0
    for link in links:
        keyword = link.get("keyword", "")
        url = link.get("url", "")
        max_ins = link.get("max_insertions_per_article", 1)

        if not keyword or not url:
            continue

        # Build pattern: match keyword not inside [...](...) or # headings
        # Use word boundaries for clean matching
        pattern = re.compile(
            r'(?<!\[)(?<!\()'           # Not preceded by [ or (
            r'\b(' + re.escape(keyword) + r')\b'
            r'(?!\]|\))',               # Not followed by ] or )
            re.IGNORECASE,
        )

        count = 0
        def _replace(match: re.Match) -> str:
            nonlocal count
            if count >= max_ins:
                return match.group(0)

            # Skip if inside a heading line
            line_start = body.rfind("\n", 0, match.start()) + 1
            line = body[line_start : match.end() + 50]
            if line.lstrip().startswith("#"):
                return match.group(0)

            # Skip if inside a code block
            before = body[: match.start()]
            if before.count("```") % 2 == 1:
                return match.group(0)

            count += 1
            original = match.group(1)
            return f'[{original}]({url}){{rel="sponsored"}}'

        body = pattern.sub(_replace, body)
        if count > 0:
            insertions += count
            print(f"  [Affiliate] Inserted {count}x link for '{keyword}'")

    if insertions > 0:
        print(f"  [Affiliate] Total: {insertions} affiliate link(s) inserted")
    else:
        print(f"  [Affiliate] No matching keywords found")

    return frontmatter + body
