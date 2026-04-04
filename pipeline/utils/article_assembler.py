"""
Deterministic article assembler — replaces the Formatter (Haiku) agent.

Takes raw outputs from the Editor, SEO/GSO Specialist, and Photo Finder,
and produces a complete Hugo-compatible .md file with YAML frontmatter
and markdown body. Zero LLM calls.
"""

import json
import re
from datetime import datetime, timezone

from pipeline.utils.frontmatter_builder import build_frontmatter


def assemble_article(
    editing_output: str,
    seo_data: dict,
    photo_data: dict,
    funnel_type: str = "TOF",
    content_type: str = "news",
) -> str:
    """
    Assemble a complete Hugo .md article from pipeline agent outputs.

    Args:
        editing_output: Raw output from the Editor (contains [REVISED ARTICLE] block)
        seo_data: Parsed JSON from the SEO/GSO Specialist
        photo_data: Parsed JSON from the Photo Finder
        funnel_type: TOF/MOF/BOF
        content_type: news/practical

    Returns:
        Complete markdown file content (YAML frontmatter + body)
    """
    # 1. Extract article body from editor output
    body = _extract_revised_article(editing_output)

    # 2. Extract SEO restructured article (preferred over editor's version
    #    since it has question H2s and FAQ)
    seo_body = _extract_seo_article(seo_data.get("_raw_output", ""))
    if seo_body and len(seo_body) > len(body) * 0.5:
        # SEO version exists and is substantial — use it
        body = seo_body

    # 3. Build photo/cover data
    image_url = photo_data.get("image_url", "")
    image_alt = photo_data.get("alt_text", "")
    photographer_name = photo_data.get("photographer_name", "")
    photographer_url = photo_data.get("photographer_url", "")
    image_source = photo_data.get("source", "")

    # 4. Build frontmatter
    title = seo_data.get("meta_title", "") or _extract_first_heading(body)
    slug = seo_data.get("slug", "")
    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    description = seo_data.get("meta_description", "")
    keywords = seo_data.get("secondary_keywords", [])
    if seo_data.get("primary_keyword"):
        keywords = [seo_data["primary_keyword"]] + [k for k in keywords if k != seo_data["primary_keyword"]]
    tags = seo_data.get("tags", [])
    categories = seo_data.get("categories", [])
    schema_type = seo_data.get("schema_type", "Article")
    has_faq = seo_data.get("has_faq", False)
    faq_pairs = seo_data.get("faq_questions", [])

    frontmatter = build_frontmatter(
        title=title,
        slug=slug,
        description=description,
        keywords=keywords,
        tags=tags,
        categories=categories,
        image_url=image_url,
        image_alt=image_alt,
        image_credit_name=photographer_name,
        image_credit_url=photographer_url,
        image_credit_source=image_source,
        schema_type=schema_type,
        has_faq=has_faq,
        faq_pairs=faq_pairs,
    )

    # 5. Clean up the body
    body = _clean_body(body)

    # 6. Ensure FAQ section exists if has_faq and faq_pairs
    if has_faq and faq_pairs and not _has_faq_section(body):
        body = _append_faq_section(body, faq_pairs)

    # 7. Combine
    return f"{frontmatter}\n\n{body.strip()}\n"


def _extract_revised_article(editing_output: str) -> str:
    """Extract the [REVISED ARTICLE] block from editor output."""
    # Try [REVISED ARTICLE]...[EDIT LOG] pattern
    match = re.search(
        r'\[REVISED\s+ARTICLE\]\s*\n(.*?)(?:\[EDIT\s+LOG\]|\Z)',
        editing_output,
        re.DOTALL | re.IGNORECASE,
    )
    if match:
        return match.group(1).strip()

    # Try [REVISED ARTICLE]...(end of text)
    match = re.search(
        r'\[REVISED\s+ARTICLE\]\s*\n(.*)',
        editing_output,
        re.DOTALL | re.IGNORECASE,
    )
    if match:
        return match.group(1).strip()

    # Fallback: return everything (minus any [EDIT LOG] suffix)
    text = re.sub(r'\[EDIT\s+LOG\].*', '', editing_output, flags=re.DOTALL | re.IGNORECASE)
    return text.strip()


def _extract_seo_article(raw_output: str) -> str:
    """Extract the [RESTRUCTURED ARTICLE] block from SEO/GSO output."""
    if not raw_output:
        return ""
    match = re.search(
        r'\[RESTRUCTURED\s+ARTICLE\]\s*\n(.*?)\[END\s+RESTRUCTURED\s+ARTICLE\]',
        raw_output,
        re.DOTALL | re.IGNORECASE,
    )
    if match:
        return match.group(1).strip()
    return ""


def _extract_first_heading(body: str) -> str:
    """Extract the first H1 or H2 heading from markdown body."""
    match = re.search(r'^#{1,2}\s+(.+)', body, re.MULTILINE)
    return match.group(1).strip() if match else "Untitled Article"


def _clean_body(body: str) -> str:
    """Clean up common LLM artifacts in article body."""
    # Remove any stray frontmatter blocks that leaked into the body
    body = re.sub(r'^---\s*\n.*?\n---\s*\n?', '', body, flags=re.DOTALL)

    # Remove any remaining [RESTRUCTURED ARTICLE] / [END ...] markers
    body = re.sub(r'\[(?:RESTRUCTURED|REVISED|END\s+RESTRUCTURED)\s+ARTICLE\]', '', body, flags=re.IGNORECASE)

    # Remove [EDIT LOG] sections
    body = re.sub(r'\[EDIT\s+LOG\].*', '', body, flags=re.DOTALL | re.IGNORECASE)

    # Remove any leading H1 (frontmatter has title — H1 would be duplicate)
    body = re.sub(r'^#\s+[^\n]+\n*', '', body.strip())

    # Clean up excessive blank lines
    body = re.sub(r'\n{3,}', '\n\n', body)

    return body.strip()


def _has_faq_section(body: str) -> bool:
    """Check if body already contains a FAQ section."""
    return bool(re.search(r'^##\s+(?:FAQ|Frequently\s+Asked)', body, re.MULTILINE | re.IGNORECASE))


def _append_faq_section(body: str, faq_pairs: list[dict]) -> str:
    """Append a FAQ section to the article body."""
    faq_lines = ["\n\n## Frequently Asked Questions\n"]
    for pair in faq_pairs:
        q = pair.get("q", pair.get("question", ""))
        a = pair.get("a", pair.get("answer", ""))
        if q and a:
            faq_lines.append(f"### {q}\n\n{a}\n")
    return body + "\n".join(faq_lines)
