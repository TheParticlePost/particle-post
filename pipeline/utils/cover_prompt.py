"""
Build a Gemini text-to-image prompt for an article cover.

Used by:
  - pipeline/backfill_covers.py — heuristic only (no LLM access for old articles)
  - pipeline/run.py — heuristic fallback when photo_data.cover_image_prompt is missing

The output is a single comma-joined prompt string suitable for the
gemini-2.5-flash-image model. It instructs the model to produce an
editorial-photograph-style cover that visually evokes the article's
subject without including any text, logos, or human faces.
"""

from __future__ import annotations

# Per-content-type style anchors. Each value is the visual mood for that
# genre — keeps covers feeling distinct across types while staying on-brand.
_STYLE_BY_CONTENT_TYPE = {
    "news_analysis": (
        "abstract editorial photograph, dramatic dark lighting, "
        "financial newsroom aesthetic"
    ),
    "industry_briefing": (
        "abstract market landscape, wide cinematic composition, "
        "trading floor mood"
    ),
    "deep_dive": (
        "abstract conceptual photograph, layered depth, "
        "premium long-form publication aesthetic"
    ),
    "case_study": (
        "abstract corporate environment, executive boardroom mood, "
        "modern enterprise aesthetic"
    ),
    "how_to": (
        "abstract process visualization, geometric flow patterns, "
        "instructional editorial style"
    ),
    "technology_profile": (
        "abstract data center and server infrastructure, "
        "glowing fiber optics, technology editorial"
    ),
}

_BASE_SUFFIX = (
    "wide 16:9 landscape composition, "
    "deep blacks with warm orange and amber highlights, "
    "cinematic depth of field, photorealistic but illustrative, "
    "premium financial publication cover, "
    "ABSOLUTELY no text, no letters, no words, no typography, no captions, "
    "no labels, no signs, no logos, no watermarks, no UI elements, "
    "no charts with axis labels, no people's faces, no human figures"
)


def _strip_subject(title: str) -> str:
    """Best-effort subject extraction from a headline.

    Strategy: take the part before the first colon (titles like
    "Walmart AI Supply Chain: How It Cut Costs 40%" → "Walmart AI Supply Chain").
    Falls back to the full title.
    """
    title = (title or "").strip()
    if not title:
        return "modern AI in business"
    if ":" in title:
        head = title.split(":", 1)[0].strip()
        if head:
            return head
    return title


def build_cover_prompt(
    title: str,
    content_type: str,
    primary_category: str = "",
) -> str:
    """Build a single Gemini image prompt from article metadata."""
    style = _STYLE_BY_CONTENT_TYPE.get(
        content_type or "",
        _STYLE_BY_CONTENT_TYPE["news_analysis"],
    )
    subject = _strip_subject(title)
    category = (primary_category or "").strip()
    parts = [
        f"Editorial photograph for an article about {subject}",
    ]
    if category:
        parts.append(f"in the context of {category}")
    parts.append(style)
    parts.append(_BASE_SUFFIX)
    return ", ".join(parts)
