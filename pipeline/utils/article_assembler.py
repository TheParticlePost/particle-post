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
    graphic_data: dict | None = None,
) -> str:
    """
    Assemble a complete Hugo .md article from pipeline agent outputs.

    Args:
        editing_output: Raw output from the Editor (contains [REVISED ARTICLE] block)
        seo_data: Parsed JSON from the SEO/GSO Specialist
        photo_data: Parsed JSON from the Photo Finder
        funnel_type: TOF/MOF/BOF
        content_type: news/practical or one of the 6 content types
        graphic_data: Optional dict with cover + visuals from Graphic Designer

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

    # 3. Build photo/cover data — prefer generated cover over stock photo
    if graphic_data and graphic_data.get("cover", {}).get("url"):
        image_url = graphic_data["cover"]["url"]
        image_alt = graphic_data["cover"].get("alt", "")
        # Don't credit generated covers — no "Photo via ai-generated" line.
        # ImageCredit component returns null when all three are empty.
        photographer_name = ""
        photographer_url = ""
        image_source = ""
    else:
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
    # Fallback: if tags are empty, derive from keywords
    if not tags and keywords:
        tags = keywords[:5]
    # Fallback: if categories are empty, use a default
    if not categories:
        categories = ["AI in Finance"]
    schema_type = seo_data.get("schema_type", "Article")
    has_faq = seo_data.get("has_faq", False)
    faq_pairs = seo_data.get("faq_questions", [])

    # 4b. Extract executive summary from the body if the writer emitted an
    #     EXECUTIVE_SUMMARY: marker. Falls back to seo_data.executive_summary
    #     if the SEO/GSO task surfaced one. Empty if neither is present —
    #     legacy backfill script can fill it in for already-published articles.
    body, executive_summary = _extract_executive_summary(body)
    if not executive_summary:
        executive_summary = seo_data.get("executive_summary") or None

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
        content_type=content_type,
        has_faq=has_faq,
        faq_pairs=faq_pairs,
        executive_summary=executive_summary,
    )

    # 5. Clean up the body
    body = _clean_body(body)

    # 6. Insert generated visuals into body
    if graphic_data and graphic_data.get("visuals"):
        body = _insert_visuals(body, graphic_data["visuals"])

    # 7. Convert visual markers to Hugo shortcodes
    body = _convert_visual_markers(body)

    # 8. Ensure FAQ section exists if has_faq and faq_pairs
    if has_faq and faq_pairs and not _has_faq_section(body):
        body = _append_faq_section(body, faq_pairs)

    # 7. Combine
    return f"{frontmatter}\n\n{body.strip()}\n"


def _extract_executive_summary(body: str) -> tuple[str, str | None]:
    """Pull an EXECUTIVE_SUMMARY: marker out of the article body.

    The writer agent emits the summary as a single-paragraph marker right
    after the title. We pull it into the frontmatter and strip it from the
    body so it doesn't double-render alongside the <ExecutiveSummary>
    component on the article page.

    Marker format (one of):
        EXECUTIVE_SUMMARY: <50-75 word paragraph in plain text>
        EXECUTIVE_SUMMARY:
        <50-75 word paragraph>

    Returns (body_without_marker, summary_text or None).
    """
    if not body:
        return body, None

    # Pattern 1: same-line marker
    m = re.search(
        r'^EXECUTIVE_SUMMARY:\s*(.+?)(?:\n\n|\Z)',
        body,
        re.MULTILINE | re.DOTALL,
    )
    if not m:
        return body, None

    summary = m.group(1).strip()
    # Collapse internal newlines so a multi-line marker becomes a single
    # paragraph for the frontmatter field.
    summary = re.sub(r'\s+', ' ', summary)

    # Strip the marker from the body. Replace with empty so the body keeps
    # its overall structure (the body cleanup pass handles double newlines).
    new_body = body[: m.start()] + body[m.end() :]
    return new_body.strip(), summary


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


def _insert_visuals(body: str, visuals: list[dict]) -> str:
    """Insert generated visuals after specified headings.

    Each visual is one of two forms:
      - Image:     {type, url, alt, insert_after_heading}
                    → inserted as `![alt](url)` markdown
      - Shortcode: {type, shortcode, insert_after_heading}
                    → inserted verbatim (shortcode text, e.g. {{< stat-box ... >}})

    stat_card visuals are always the shortcode form so they render via
    the theme-adaptive React StatBox component instead of a baked-in PNG.

    Uses fuzzy heading matching (50% word overlap) so "The Results" matches
    headings like "What the Initial Results Showed" or "Results and Impact".
    """
    for visual in visuals:
        target = visual.get("insert_after_heading", "")
        url = visual.get("url", "")
        alt = visual.get("alt", "")
        shortcode = visual.get("shortcode", "")
        if not target or (not url and not shortcode):
            continue

        # Fuzzy match: find the H2 heading with best word overlap
        target_words = set(target.lower().replace("#", "").split())
        best_match = None
        best_overlap = 0

        for m in re.finditer(r'(##\s+[^\n]+)\n', body):
            heading_text = m.group(1)
            heading_words = set(heading_text.lower().replace("#", "").split())
            overlap = len(target_words & heading_words)
            threshold = max(1, len(target_words) * 0.5)
            if overlap >= threshold and overlap > best_overlap:
                best_overlap = overlap
                best_match = m

        if best_match:
            # Insert after the heading + first paragraph
            insert_pos = best_match.end()
            para_end = body.find("\n\n", insert_pos)
            if para_end > 0:
                insert_pos = para_end
            if shortcode:
                insertion = f"\n\n{shortcode}\n"
            else:
                insertion = f"\n\n![{alt}]({url})\n"
            body = body[:insert_pos] + insertion + body[insert_pos:]

    return body


def _convert_visual_markers(body: str) -> str:
    """Convert text markers to Hugo/MDX shortcodes.

    Markers generated by the pipeline (BEFORE_AFTER:, TIMELINE:, etc.)
    are converted to Hugo shortcode format which the remark plugin transforms
    into React components.
    """
    # BEFORE_AFTER: metric | Before: value | After: value | Source: name
    body = re.sub(
        r'BEFORE_AFTER:\s*(.+?)\s*\|\s*Before:\s*(.+?)\s*\|\s*After:\s*(.+?)\s*\|\s*Source:\s*(.+)',
        r'{{< before-after metric="\1" before="\2" after="\3" source="\4" >}}',
        body,
    )

    # PROCESS_FLOW: Step1, Step2, Step3
    body = re.sub(
        r"PROCESS_FLOW:\s*(.+)",
        lambda m: '{{< process-flow steps=\'' + json.dumps(
            [s.strip() for s in m.group(1).split(",")]
        ) + "' >}}",
        body,
    )

    # TIMELINE: Date1:Event1, Date2:Event2
    body = re.sub(
        r"TIMELINE:\s*(.+)",
        lambda m: '{{< timeline-viz events=\'' + json.dumps(
            [{"date": p.split(":")[0].strip(), "event": ":".join(p.split(":")[1:]).strip()}
             for p in m.group(1).split(",") if ":" in p]
        ) + "' >}}",
        body,
    )

    # VERDICT: rating | title | summary
    body = re.sub(
        r'VERDICT:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)',
        r'{{< verdict rating="\1" title="\2" summary="\3" >}}',
        body,
    )

    # PERSONA_NOTE: role | text
    body = re.sub(
        r'PERSONA_NOTE:\s*(.+?)\s*\|\s*(.+)',
        r'{{< persona-note role="\1" text="\2" >}}',
        body,
    )

    # STAT: number | label | source
    body = re.sub(
        r'^STAT:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+)$',
        r'{{< stat-box value="\1" label="\2" source="\3" >}}',
        body,
        flags=re.MULTILINE,
    )

    # STAT: number | label (no source variant)
    body = re.sub(
        r'^STAT:\s*(.+?)\s*\|\s*(.+)$',
        r'{{< stat-box value="\1" label="\2" source="" >}}',
        body,
        flags=re.MULTILINE,
    )

    return body
