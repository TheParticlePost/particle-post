from pipeline.utils.date_helpers import utc_now_iso


# Maps content_type to the curator slug from lib/authors.ts.
# Mirrors lib/authors.ts:AUTHORS[*].defaultFor — keep these in sync. If you
# add a new content_type or curator, update both files plus
# pipeline/scripts/backfill_authors.py.
_CONTENT_TYPE_TO_AUTHOR_SLUG: dict[str, str] = {
    "news_analysis": "william-hayes",
    "industry_briefing": "william-hayes",
    "deep_dive": "marie-tremblay",
    "case_study": "marie-tremblay",
    "how_to": "alex-park",
    "technology_profile": "alex-park",
}
_DEFAULT_AUTHOR_SLUG = "william-hayes"


def author_for_content_type(content_type: str | None) -> str:
    """Return the curator slug for a content_type. Mirrors getAuthorForContentType
    in lib/authors.ts so future articles get the same byline the live site
    expects."""
    if content_type is None:
        return _DEFAULT_AUTHOR_SLUG
    return _CONTENT_TYPE_TO_AUTHOR_SLUG.get(content_type, _DEFAULT_AUTHOR_SLUG)


def build_frontmatter(
    title: str,
    slug: str,
    description: str,
    keywords: list[str],
    tags: list[str],
    categories: list[str],
    image_url: str,
    image_alt: str,
    image_credit_name: str,
    image_credit_url: str,
    image_credit_source: str,
    author: str | None = None,
    schema_type: str = "Article",
    content_type: str = "news_analysis",
    has_faq: bool = False,
    faq_pairs: list[dict] | None = None,
) -> str:
    """Build a YAML frontmatter block for a Hugo/Next.js post.

    If `author` isn't explicitly passed, the curator slug is selected
    deterministically by content_type via author_for_content_type().
    """
    if not author:
        author = author_for_content_type(content_type)

    def _yaml_list(items: list[str]) -> str:
        return "[" + ", ".join(f'"{i}"' for i in items) + "]"

    lines = [
        "---",
        f'title: "{_escape(title)}"',
        f'date: "{utc_now_iso()}"',
        f'slug: "{slug}"',
        f'description: "{_escape(description)}"',
        f"keywords: {_yaml_list(keywords)}",
        f'author: "{author}"',
        f"tags: {_yaml_list(tags)}",
        f"categories: {_yaml_list(categories)}",
        f'schema_type: "{schema_type}"',
        f'content_type: "{content_type}"',
        f"has_faq: {'true' if has_faq else 'false'}",
    ]

    # Cover image as nested YAML block (Next.js format)
    if image_url:
        lines.append("cover:")
        lines.append(f'  image: "{image_url}"')
        lines.append(f'  alt: "{_escape(image_alt)}"')
        lines.append(f'  credit_name: "{_escape(image_credit_name)}"')
        lines.append(f'  credit_url: "{image_credit_url}"')
        lines.append(f'  credit_source: "{image_credit_source}"')
    # Also keep flat image field for backward compat
    lines.append(f'image: "{image_url}"')
    lines.append(f'image_alt: "{_escape(image_alt)}"')
    lines.append(f'image_credit_name: "{_escape(image_credit_name)}"')
    lines.append(f'image_credit_url: "{image_credit_url}"')
    lines.append(f'image_credit_source: "{image_credit_source}"')

    # FAQ pairs as YAML list of maps
    if has_faq and faq_pairs:
        lines.append("faq_pairs:")
        for pair in faq_pairs:
            q = pair.get("q", pair.get("question", ""))
            a = pair.get("a", pair.get("answer", ""))
            if q and a:
                lines.append(f'  - question: "{_escape(q)}"')
                lines.append(f'    answer: "{_escape(a)}"')

    lines.extend([
        "ShowToc: true",
        "TocOpen: false",
        "draft: false",
        "---",
    ])
    return "\n".join(lines)


def _escape(text: str) -> str:
    """Escape double quotes in YAML string values."""
    return text.replace('"', '\\"')
