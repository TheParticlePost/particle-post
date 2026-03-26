"""Builds an enriched, searchable article index from published posts.

Reads post_index.json + topics_history.json + markdown frontmatter to create
a unified index with titles, URLs, keywords, tags, and summaries.
"""

import json
import re
from pathlib import Path

_BASE = Path(__file__).resolve().parents[2]
_POST_INDEX = _BASE / "pipeline" / "config" / "post_index.json"
_TOPICS_HISTORY = _BASE / "blog" / "data" / "topics_history.json"
_POSTS_DIR = _BASE / "blog" / "content" / "posts"
_SOCIAL_DATA = Path(__file__).resolve().parent / "data"
_INDEX_PATH = _SOCIAL_DATA / "article_index.json"
_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "social_config.json"


def _load_config() -> dict:
    return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))


def _parse_frontmatter(md_path: Path) -> dict:
    """Extract YAML frontmatter fields from a markdown file."""
    text = md_path.read_text(encoding="utf-8", errors="replace")
    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return {}
    fm = {}
    raw = match.group(1)
    # Simple YAML-ish parsing for the fields we need
    for key in ("title", "description", "slug"):
        m = re.search(rf'^{key}:\s*"?(.+?)"?\s*$', raw, re.MULTILINE)
        if m:
            fm[key] = m.group(1).strip().strip('"')
    # Parse keywords list
    kw_match = re.search(r"^keywords:\s*\n((?:\s+-\s+.+\n?)+)", raw, re.MULTILINE)
    if kw_match:
        fm["keywords"] = [
            line.strip().lstrip("- ").strip('"')
            for line in kw_match.group(1).strip().split("\n")
            if line.strip()
        ]
    return fm


def build_index() -> list[dict]:
    """Build the enriched article index and save to disk."""
    config = _load_config()
    site_url = config.get("site_url", "https://theparticlepost.com")

    # Load existing index for sharing stats
    existing = {}
    if _INDEX_PATH.exists():
        try:
            for art in json.loads(_INDEX_PATH.read_text(encoding="utf-8")):
                existing[art["slug"]] = art
        except Exception:
            pass

    # Load post_index for slugs, titles, dates, funnel types
    posts = []
    if _POST_INDEX.exists():
        data = json.loads(_POST_INDEX.read_text(encoding="utf-8"))
        posts = data.get("posts", [])

    # Load topics_history for tags
    tags_map = {}
    if _TOPICS_HISTORY.exists():
        data = json.loads(_TOPICS_HISTORY.read_text(encoding="utf-8"))
        for entry in data.get("posts", []):
            slug = entry.get("slug", "")
            if slug:
                tags_map[slug] = entry.get("tags", [])

    # Build enriched index
    index = []
    for post in posts:
        slug = post.get("slug", "")
        if not slug:
            continue

        # Find markdown file for frontmatter
        date = post.get("date", "")
        md_candidates = list(_POSTS_DIR.glob(f"*{slug}*.md"))
        fm = {}
        if md_candidates:
            fm = _parse_frontmatter(md_candidates[0])

        # Merge data from all sources
        prev = existing.get(slug, {})
        article = {
            "slug": slug,
            "title": fm.get("title", post.get("title", "")),
            "url": f"{site_url}/posts/{slug}/",
            "date": date,
            "funnel_type": post.get("funnel_type", ""),
            "tags": tags_map.get(slug, []),
            "keywords": fm.get("keywords", []),
            "summary": fm.get("description", ""),
            "times_shared": prev.get("times_shared", 0),
            "last_shared_date": prev.get("last_shared_date"),
        }
        index.append(article)

    # Save
    _SOCIAL_DATA.mkdir(parents=True, exist_ok=True)
    _INDEX_PATH.write_text(json.dumps(index, indent=2), encoding="utf-8")
    return index


def load_index() -> list[dict]:
    """Load the article index from disk."""
    if not _INDEX_PATH.exists():
        return build_index()
    return json.loads(_INDEX_PATH.read_text(encoding="utf-8"))


def get_compact_index() -> str:
    """Return a compact string representation for LLM context (titles + keywords only)."""
    articles = load_index()
    lines = []
    for a in articles:
        kw = ", ".join(a.get("keywords", [])[:5])
        tags = ", ".join(a.get("tags", [])[:5])
        lines.append(f"- [{a['slug']}] {a['title']} | Keywords: {kw} | Tags: {tags}")
    return "\n".join(lines)


if __name__ == "__main__":
    articles = build_index()
    print(f"Built article index: {len(articles)} articles")
    for a in articles[:5]:
        print(f"  {a['date']} | {a['title'][:60]} | {len(a['keywords'])} keywords")
