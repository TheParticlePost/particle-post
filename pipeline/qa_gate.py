#!/usr/bin/env python3
"""
Particle Post QA Gate — Pre-publish programmatic validation.

Pure Python checks (NO LLM calls) that catch obvious content issues
before the Production Director agent runs. Saves LLM cost by rejecting
articles that would clearly fail review.

Usage:
    from pipeline.qa_gate import validate, print_report
    passed, issues, score = validate(content, "TOF", "news")
    print_report(issues, score)
"""

import re

from pipeline.run import _extract_frontmatter_field, _extract_frontmatter_list


# ──────────────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────────────

WORD_COUNT_RANGES: dict[str, tuple[int, int]] = {
    "TOF": (600, 1150),
    "MOF": (1800, 3000),
    "BOF": (1200, 2000),
}

# Minimum shareable data charts per content_type. The writer pipeline is
# expected to emit {{< bar-chart >}} or {{< time-series-chart >}}
# shortcodes; each chart gets a LinkedIn/X share button on the published
# page with a dynamic OG image showing the chart itself. See
# pipeline/prompts/writer_backstory.txt "CHART DISCIPLINE" section.
#
# Content types not listed default to 1 (the TOF minimum).
CHART_MIN_PER_CONTENT_TYPE: dict[str, int] = {
    "news_analysis": 1,
    "industry_briefing": 1,
    "how_to": 2,
    "technology_profile": 2,
    "deep_dive": 3,
    "case_study": 3,
}

SOURCE_PATTERNS: list[str] = [
    r"according to",
    r"\bper\b [A-Z]",
    r"reported by",
    r"says ",
    r"found that",
    r"published by",
    r"data from",
    r"research from",
]

AI_TELL_WORDS: list[str] = [
    "delve",
    "game-changing",
    "transformative",
    "groundbreaking",
    "unprecedented",
    "utilize",
    "leverage",
    "seamlessly",
    "furthermore",
    "moreover",
    "needless to say",
    "rest assured",
    "it's worth noting",
    "in today's rapidly",
    "navigate the landscape",
]

GENERIC_H2S: list[str] = [
    "Background",
    "Analysis",
    "Discussion",
    "Overview",
    "Key Developments",
    "Market Analysis",
    "Introduction",
    "Context",
    "Conclusion",
]


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _extract_body(content: str) -> str:
    """Return content body after YAML frontmatter (--- ... ---)."""
    match = re.match(r"^---\s*\n.*?\n---\s*\n?", content, re.DOTALL)
    if match:
        return content[match.end():]
    return content


def _count_words(text: str) -> int:
    """Count words in text body."""
    return len(text.split())


def _count_source_citations(body: str) -> int:
    """Count unique source citation pattern matches."""
    count = 0
    for pattern in SOURCE_PATTERNS:
        count += len(re.findall(pattern, body, re.IGNORECASE))
    return count


def _find_ai_tells(body: str) -> list[str]:
    """Return list of AI-tell words/phrases found in body."""
    found = []
    lower_body = body.lower()
    for word in AI_TELL_WORDS:
        if word.lower() in lower_body:
            found.append(word)
    return found


def _extract_h2s(body: str) -> list[str]:
    """Extract H2 headings from markdown body."""
    return re.findall(r"^## (.+)", body, re.MULTILINE)


# ──────────────────────────────────────────────────────────────────────────────
# Core validation
# ──────────────────────────────────────────────────────────────────────────────

def validate(
    content: str,
    funnel_type: str = "TOF",
    content_type: str = "news",
) -> tuple[bool, list[str], int]:
    """Validate article content programmatically.

    Returns (passed, issues, score).
    - passed: True if score >= 60
    - issues: list of human-readable issue descriptions
    - score: 0-100 quality score
    """
    score = 100
    issues: list[str] = []

    body = _extract_body(content)

    # ── 1. Title length (30-60 chars) ────────────────────────────────────
    title = _extract_frontmatter_field(content, "title")
    if title:
        tlen = len(title)
        if tlen < 30 or tlen > 60:
            score -= 10
            issues.append(f"Title length {tlen} chars — should be 30-60 ('{title[:50]}...')")
    else:
        score -= 10
        issues.append("Title missing from frontmatter")

    # ── 2. Description length (120-155 chars) ────────────────────────────
    desc = _extract_frontmatter_field(content, "description")
    if desc:
        dlen = len(desc)
        if dlen < 120 or dlen > 155:
            score -= 5
            issues.append(f"Description length {dlen} chars — should be 120-155")
    else:
        score -= 5
        issues.append("Description missing from frontmatter")

    # ── 3. Slug format ───────────────────────────────────────────────────
    slug = _extract_frontmatter_field(content, "slug")
    if slug:
        if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", slug):
            score -= 5
            issues.append(f"Slug format invalid: '{slug}' — must be lowercase, hyphens only, no special chars")
    else:
        score -= 5
        issues.append("Slug missing from frontmatter")

    # ── 4. Categories present ────────────────────────────────────────────
    categories = _extract_frontmatter_list(content, "categories")
    if not categories:
        score -= 10
        issues.append("Categories missing or empty in frontmatter")

    # ── 5. Cover image valid ─────────────────────────────────────────────
    cover = _extract_frontmatter_field(content, "cover")
    if not cover:
        cover = _extract_frontmatter_field(content, "coverImage")
    if not cover:
        cover = _extract_frontmatter_field(content, "image")
    if not cover:
        score -= 10
        issues.append("Cover image missing from frontmatter")
    elif "picsum.photos" in cover:
        score -= 10
        issues.append(f"Cover image uses placeholder (picsum.photos): {cover}")
    elif "pixabay.com/get/" in cover:
        score -= 10
        issues.append(f"Cover image uses raw Pixabay hotlink (pixabay.com/get/): {cover}")

    # ── 6. Word count in range ───────────────────────────────────────────
    word_count = _count_words(body)
    ft = funnel_type.upper()
    wc_min, wc_max = WORD_COUNT_RANGES.get(ft, (600, 1000))
    if word_count < wc_min or word_count > wc_max:
        score -= 15
        issues.append(
            f"Word count {word_count} — out of range for {ft} "
            f"(expected {wc_min}-{wc_max})"
        )

    # ── 7. Source citations >= 3 ─────────────────────────────────────────
    citation_count = _count_source_citations(body)
    if citation_count < 3:
        score -= 15
        issues.append(f"Only {citation_count} source citation(s) found — need at least 3")

    # ── 8. Zero AI-tell words ────────────────────────────────────────────
    ai_tells = _find_ai_tells(body)
    if ai_tells:
        penalty = min(len(ai_tells) * 5, 20)
        score -= penalty
        issues.append(
            f"AI-tell words found ({len(ai_tells)}): "
            + ", ".join(f'"{w}"' for w in ai_tells)
        )

    # ── 9. >= 2 H2 headings ─────────────────────────────────────────────
    h2s = _extract_h2s(body)
    if len(h2s) < 2:
        score -= 10
        issues.append(f"Only {len(h2s)} H2 heading(s) — need at least 2")

    # ── 10. H2s not generic ──────────────────────────────────────────────
    generic_found = [h for h in h2s if h.strip() in GENERIC_H2S]
    if generic_found:
        penalty = min(len(generic_found) * 5, 15)
        score -= penalty
        issues.append(
            f"Generic H2 heading(s): "
            + ", ".join(f'"{h}"' for h in generic_found)
        )

    # ── 11. >= 1 internal link ───────────────────────────────────────────
    internal_links = re.findall(r"\[.*?\]\(/posts/", body)
    if not internal_links:
        score -= 10
        issues.append("No internal links to /posts/ found")

    # ── 12. Image alt text ───────────────────────────────────────────────
    empty_alts = re.findall(r"!\[\]\(", body)
    if empty_alts:
        score -= 5
        issues.append(f"Found {len(empty_alts)} image(s) without alt text (![](...))")

    # ── 13. No em-dashes ─────────────────────────────────────────────────
    em_dash_count = body.count("\u2014")
    if em_dash_count > 0:
        penalty = min(em_dash_count * 5, 15)
        score -= penalty
        issues.append(f"Found {em_dash_count} em-dash(es) (U+2014) — use regular dashes")

    # ── 14. No double-hyphens as dashes ──────────────────────────────────
    if " -- " in body:
        score -= 3
        issues.append("Found ' -- ' double-hyphen pattern — use a single dash")

    # ── 15. FAQ section present if needed ────────────────────────────────
    schema_type = _extract_frontmatter_field(content, "schema_type")
    if schema_type == "FAQPage":
        has_faq = bool(re.search(r"^## FAQ|^## Frequently Asked", body, re.MULTILINE))
        if not has_faq:
            score -= 5
            issues.append(
                'schema_type is "FAQPage" but no ## FAQ or '
                "## Frequently Asked section found"
            )

    # ── 16. Vague lede detection ─────────────────────────────────────────
    # First 2 sentences should name a company, person, dollar amount, or date
    first_para = body.split("\n\n")[0] if body else ""
    if first_para and len(first_para) > 20:
        has_specifics = bool(
            re.search(r'\$\d', first_para)  # dollar amount
            or re.search(r'\b\d{4}\b', first_para)  # year
            or re.search(r'\b\d+%', first_para)  # percentage
            or re.search(r'\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+', first_para)  # proper noun (2+ words)
        )
        if not has_specifics:
            score -= 10
            issues.append(
                "Vague lede — first paragraph has no specific company, person, "
                "dollar amount, percentage, or date"
            )

    # ── 17. Shareable chart count per content_type ──────────────────────
    # Count {{< bar-chart >}} and {{< time-series-chart >}} shortcodes in
    # the body. Each chart gets a LinkedIn/X share button + dynamic OG
    # image on the published page, so the article's "shareable surface
    # area" is directly proportional to chart count. A chart-free article
    # is a social-sharing dead end.
    chart_count = len(
        re.findall(
            r"\{\{<\s*(?:bar-chart|time-series-chart)\b",
            body,
        )
    )
    chart_min = CHART_MIN_PER_CONTENT_TYPE.get(content_type, 1)
    if chart_count < chart_min:
        # Penalty scales with the deficit, capped at 20 so a chart-free
        # deep_dive (needs 3) doesn't alone kill the whole QA score.
        deficit = chart_min - chart_count
        penalty = min(deficit * 7, 20)
        score -= penalty
        issues.append(
            f"Only {chart_count} shareable chart(s) found "
            f"(bar-chart + time-series-chart) — {content_type} needs "
            f"at least {chart_min}. Add {{{{< bar-chart >}}}} or "
            f"{{{{< time-series-chart >}}}} shortcodes with data the "
            f"reader would want to save and share."
        )

    # ── 18. Consecutive charts forbidden ────────────────────────────────
    # Two visual blocks (chart or stat-box) with nothing but whitespace
    # between them produce the "wall of charts" UX that tanks reader
    # trust. Every chart must be followed by at least one paragraph of
    # prose that names a data point from that chart before the next
    # visual appears. See writer_backstory.txt CHART PLACEMENT for the
    # full rule.
    visual_block_re = re.compile(
        r"\{\{<\s*(?:bar-chart|time-series-chart|stat-box)\b[^>]*>\}\}",
        re.DOTALL,
    )
    visual_matches = list(visual_block_re.finditer(body))
    consecutive_pairs = 0
    for i in range(len(visual_matches) - 1):
        end_of_first = visual_matches[i].end()
        start_of_second = visual_matches[i + 1].start()
        gap = body[end_of_first:start_of_second]
        # "Prose" = at least 120 characters of non-whitespace, non-markdown
        # content. Tighter than "any text" to catch cases where the writer
        # inserts a single short caption and calls it commentary.
        gap_text = re.sub(r"\s+", " ", gap).strip()
        if len(gap_text) < 120:
            consecutive_pairs += 1
    if consecutive_pairs > 0:
        penalty = min(consecutive_pairs * 8, 20)
        score -= penalty
        issues.append(
            f"{consecutive_pairs} back-to-back visual block(s) with fewer "
            f"than 120 characters of prose between them. Every chart or "
            f"stat-box must be followed by at least one paragraph of "
            f"narrative that names a data point from it. See writer "
            f"backstory CHART PLACEMENT rule."
        )

    # ── 19. Before/after component banned ───────────────────────────────
    # The {{< before-after >}} shortcode and the auto-generated
    # ![Before After visualization](...) PNG image tag both render as
    # low-quality text-clipped cards. The component is deprecated; use a
    # bar-chart with two bars or prose instead. See writer_backstory.txt
    # BEFORE / AFTER CARD — BANNED section.
    before_after_shortcode = len(
        re.findall(r"\{\{<\s*before-after\b", body)
    )
    before_after_image = len(
        re.findall(
            r"!\[[^\]]*\]\([^)]*/visuals/[^)]*-before_after\.png",
            body,
        )
    )
    before_after_total = before_after_shortcode + before_after_image
    if before_after_total > 0:
        score -= 15
        issues.append(
            f"{before_after_total} deprecated before-after reference(s) "
            f"found ({before_after_shortcode} shortcode(s), "
            f"{before_after_image} image tag(s)). The before-after "
            f"component is banned. Replace with a {{{{< bar-chart >}}}} "
            f"containing two bars (before state, after state) or with "
            f"plain prose naming both numbers inline."
        )

    # Clamp score
    score = max(score, 0)
    passed = score >= 65

    return passed, issues, score


# ──────────────────────────────────────────────────────────────────────────────
# Report printer
# ──────────────────────────────────────────────────────────────────────────────

def print_report(issues: list[str], score: int) -> None:
    """Print a formatted QA gate report."""
    status = "PASS" if score >= 65 else "FAIL"
    print(f"\n{'='*60}")
    print(f"  QA GATE REPORT  |  Score: {score}/100  |  {status}")
    print(f"{'='*60}")
    if issues:
        for issue in issues:
            print(f"  - {issue}")
    else:
        print("  No issues found.")
    print(f"{'='*60}\n")


# ──────────────────────────────────────────────────────────────────────────────
# CLI entry point (for standalone testing)
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m pipeline.qa_gate <article.md> [funnel_type] [content_type]")
        sys.exit(1)

    filepath = sys.argv[1]
    ft = sys.argv[2] if len(sys.argv) > 2 else "TOF"
    ct = sys.argv[3] if len(sys.argv) > 3 else "news"

    with open(filepath, encoding="utf-8") as f:
        article_content = f.read()

    passed, issues, score = validate(article_content, ft, ct)
    print_report(issues, score)
    sys.exit(0 if passed else 1)
