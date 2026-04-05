"""
SVG template functions for Particle Post branded graphics.
Each function returns a complete, valid SVG string.
"""

from __future__ import annotations

from xml.sax.saxutils import escape

from pipeline.graphics.brand import (
    CARBON,
    COVER_HEIGHT,
    COVER_WIDTH,
    CREAM,
    DRIFT,
    EMBER,
    FONT_BODY,
    FONT_HEADLINE,
    FONT_MONO,
    GHOST,
    GREEN,
    ONYX,
    RED,
    RICH_BLACK,
    VERMILLION,
    WARM_WHITE,
)

# ---------------------------------------------------------------------------
# Font CSS block (reused in every SVG).  No src URLs here -- the renderer's
# HTML wrapper handles actual font file loading.
# ---------------------------------------------------------------------------
FONT_CSS = """
  @font-face { font-family: 'Sora'; font-weight: 700; }
  @font-face { font-family: 'DM Sans'; font-weight: 400; }
  @font-face { font-family: 'DM Sans'; font-weight: 600; }
  @font-face { font-family: 'IBM Plex Mono'; font-weight: 400; }
  @font-face { font-family: 'IBM Plex Mono'; font-weight: 500; }
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _wrap_text(text: str, max_chars: int = 35) -> list[str]:
    """Wrap *text* into lines of at most *max_chars*, breaking at word boundaries."""
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _e(text: str) -> str:
    """Escape text for safe embedding in XML/SVG."""
    return escape(text)


def _svg_open(
    width: int = COVER_WIDTH,
    height: int = COVER_HEIGHT,
    extra_defs: str = "",
) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        f"<defs><style>{FONT_CSS}</style>{extra_defs}</defs>"
    )


SVG_CLOSE = "</svg>"


# ═══════════════════════════════════════════════════════════════════════════
# Cover templates  (all 1200 x 627)
# ═══════════════════════════════════════════════════════════════════════════


def cover_news_analysis(title: str, date: str) -> str:
    """News Analysis cover with left vermillion stripe and decorative rects."""
    lines = _wrap_text(title, 35)
    title_els = "\n".join(
        f'    <text x="60" y="{140 + i * 48}" '
        f'font-family="{FONT_HEADLINE}" font-weight="700" font-size="36" '
        f'fill="{WARM_WHITE}">{_e(line)}</text>'
        for i, line in enumerate(lines[:3])
    )

    return f"""{_svg_open()}
  <rect width="{COVER_WIDTH}" height="{COVER_HEIGHT}" fill="{RICH_BLACK}"/>
  <!-- Vermillion left stripe -->
  <rect x="0" y="0" width="4" height="{COVER_HEIGHT}" fill="{VERMILLION}"/>
  <!-- Overline -->
  <text x="60" y="80"
    font-family="{FONT_MONO}" font-weight="400" font-size="11"
    fill="{VERMILLION}" letter-spacing="3"
  >NEWS ANALYSIS</text>
  <!-- Title -->
{title_els}
  <!-- Date -->
  <text x="60" y="580"
    font-family="{FONT_MONO}" font-weight="400" font-size="12"
    fill="{DRIFT}"
  >{_e(date)}</text>
  <!-- Decorative rectangles (right side, ghost borders) -->
  <rect x="820" y="100" width="160" height="160" rx="4"
    fill="none" stroke="{EMBER}" stroke-opacity="0.2"
    transform="rotate(6 900 180)"/>
  <rect x="900" y="220" width="120" height="120" rx="4"
    fill="none" stroke="{EMBER}" stroke-opacity="0.2"
    transform="rotate(-4 960 280)"/>
  <rect x="1000" y="60" width="100" height="100" rx="4"
    fill="none" stroke="{EMBER}" stroke-opacity="0.2"
    transform="rotate(10 1050 110)"/>
{SVG_CLOSE}"""


def cover_deep_dive(title: str, date: str) -> str:
    """Deep Dive cover with subtle grid and centered layout."""
    lines = _wrap_text(title, 30)
    title_els = "\n".join(
        f'    <text x="600" y="{250 + i * 52}" text-anchor="middle" '
        f'font-family="{FONT_HEADLINE}" font-weight="700" font-size="42" '
        f'fill="{WARM_WHITE}">{_e(line)}</text>'
        for i, line in enumerate(lines[:3])
    )

    # Build grid pattern
    grid_defs = (
        '<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">'
        f'<path d="M 40 0 L 0 0 0 40" fill="none" stroke="{VERMILLION}" '
        f'stroke-opacity="0.08" stroke-width="0.5"/></pattern>'
    )

    return f"""{_svg_open(extra_defs=grid_defs)}
  <rect width="{COVER_WIDTH}" height="{COVER_HEIGHT}" fill="{RICH_BLACK}"/>
  <!-- Subtle grid -->
  <rect width="{COVER_WIDTH}" height="{COVER_HEIGHT}" fill="url(#grid)"/>
  <!-- Overline -->
  <text x="600" y="160" text-anchor="middle"
    font-family="{FONT_MONO}" font-weight="400" font-size="11"
    fill="{VERMILLION}" letter-spacing="3"
  >DEEP DIVE</text>
  <!-- Title -->
{title_els}
  <!-- Bottom rule -->
  <rect x="500" y="590" width="200" height="2" fill="{VERMILLION}"/>
  <!-- Date -->
  <text x="600" y="570" text-anchor="middle"
    font-family="{FONT_MONO}" font-weight="400" font-size="12"
    fill="{DRIFT}"
  >{_e(date)}</text>
{SVG_CLOSE}"""


def cover_case_study(title: str, company: str, hero_metric: str) -> str:
    """Case Study cover: left info panel + right hero metric."""
    lines = _wrap_text(title, 40)
    title_els = "\n".join(
        f'    <text x="60" y="{220 + i * 28}" '
        f'font-family="{FONT_BODY}" font-weight="400" font-size="20" '
        f'fill="{DRIFT}">{_e(line)}</text>'
        for i, line in enumerate(lines[:4])
    )

    return f"""{_svg_open()}
  <rect width="{COVER_WIDTH}" height="{COVER_HEIGHT}" fill="{RICH_BLACK}"/>
  <!-- Left panel -->
  <text x="60" y="80"
    font-family="{FONT_MONO}" font-weight="400" font-size="11"
    fill="{VERMILLION}" letter-spacing="3"
  >CASE STUDY</text>
  <text x="60" y="160"
    font-family="{FONT_HEADLINE}" font-weight="700" font-size="28"
    fill="{CREAM}"
  >{_e(company)}</text>
{title_els}
  <!-- Vertical separator (ghost border) -->
  <line x1="720" y1="40" x2="720" y2="587" stroke="{EMBER}" stroke-opacity="0.2"/>
  <!-- Hero metric (right panel, centered) -->
  <text x="960" y="340" text-anchor="middle"
    font-family="{FONT_HEADLINE}" font-weight="700" font-size="72"
    fill="{VERMILLION}"
  >{_e(hero_metric)}</text>
{SVG_CLOSE}"""


def cover_how_to(title: str, steps_preview: list[str]) -> str:
    """Implementation Guide cover with step preview cards."""
    steps = steps_preview[:4]
    cards = []
    for i, step in enumerate(steps):
        x = 60 + i * 220
        label = _e(step[:28])
        cards.append(
            f'  <rect x="{x}" y="120" width="200" height="60" rx="4" '
            f'fill="none" stroke="{EMBER}" stroke-opacity="0.2"/>\n'
            f'  <text x="{x + 16}" y="152" '
            f'font-family="{FONT_HEADLINE}" font-weight="700" font-size="14" '
            f'fill="{VERMILLION}">{i + 1}.</text>\n'
            f'  <text x="{x + 40}" y="158" '
            f'font-family="{FONT_BODY}" font-weight="400" font-size="12" '
            f'fill="{CREAM}">{label}</text>'
        )
    cards_svg = "\n".join(cards)

    lines = _wrap_text(title, 35)
    title_els = "\n".join(
        f'    <text x="60" y="{340 + i * 44}" '
        f'font-family="{FONT_HEADLINE}" font-weight="700" font-size="32" '
        f'fill="{WARM_WHITE}">{_e(line)}</text>'
        for i, line in enumerate(lines[:3])
    )

    return f"""{_svg_open()}
  <rect width="{COVER_WIDTH}" height="{COVER_HEIGHT}" fill="{RICH_BLACK}"/>
  <!-- Overline -->
  <text x="60" y="60"
    font-family="{FONT_MONO}" font-weight="400" font-size="11"
    fill="{VERMILLION}" letter-spacing="3"
  >IMPLEMENTATION GUIDE</text>
  <!-- Step preview cards -->
{cards_svg}
  <!-- Title -->
{title_els}
{SVG_CLOSE}"""


def cover_technology_profile(title: str, vendor_count: int) -> str:
    """Technology Profile cover with abstract circuit pattern."""
    # Circuit pattern: circles connected by lines
    nodes = [
        (900, 80), (1020, 60), (1100, 130), (960, 180),
        (1060, 220), (850, 150), (1140, 60), (980, 100),
    ]
    circles = "\n".join(
        f'  <circle cx="{cx}" cy="{cy}" r="4" fill="{VERMILLION}"/>'
        for cx, cy in nodes
    )
    edges = [
        (0, 1), (1, 2), (2, 3), (3, 0), (4, 2), (5, 0), (6, 1), (7, 3),
    ]
    lines_svg = "\n".join(
        f'  <line x1="{nodes[a][0]}" y1="{nodes[a][1]}" '
        f'x2="{nodes[b][0]}" y2="{nodes[b][1]}" '
        f'stroke="{EMBER}" stroke-width="1"/>'
        for a, b in edges
    )

    lines_text = _wrap_text(title, 35)
    title_els = "\n".join(
        f'    <text x="60" y="{460 + i * 48}" '
        f'font-family="{FONT_HEADLINE}" font-weight="700" font-size="36" '
        f'fill="{WARM_WHITE}">{_e(line)}</text>'
        for i, line in enumerate(lines_text[:3])
    )

    return f"""{_svg_open()}
  <rect width="{COVER_WIDTH}" height="{COVER_HEIGHT}" fill="{RICH_BLACK}"/>
  <!-- Circuit pattern -->
{lines_svg}
{circles}
  <!-- Overline -->
  <text x="60" y="400"
    font-family="{FONT_MONO}" font-weight="400" font-size="11"
    fill="{VERMILLION}" letter-spacing="3"
  >TECHNOLOGY PROFILE</text>
  <!-- Title -->
{title_els}
  <!-- Vendor count badge -->
  <text x="60" y="560"
    font-family="{FONT_MONO}" font-weight="400" font-size="12"
    fill="{DRIFT}"
  >Comparing {vendor_count} platforms</text>
{SVG_CLOSE}"""


def cover_industry_briefing(industry: str, date: str, dev_count: int) -> str:
    """Weekly Briefing cover for a specific industry."""
    return f"""{_svg_open()}
  <rect width="{COVER_WIDTH}" height="{COVER_HEIGHT}" fill="{RICH_BLACK}"/>
  <!-- Overline -->
  <text x="60" y="80"
    font-family="{FONT_MONO}" font-weight="400" font-size="11"
    fill="{VERMILLION}" letter-spacing="3"
  >WEEKLY BRIEFING</text>
  <!-- Industry name -->
  <text x="60" y="180"
    font-family="{FONT_HEADLINE}" font-weight="700" font-size="48"
    fill="{WARM_WHITE}"
  >{_e(industry)}</text>
  <!-- Calendar icon + date -->
  <g transform="translate(60, 260)">
    <rect x="0" y="0" width="18" height="18" rx="2" fill="none"
      stroke="{DRIFT}" stroke-width="1.5"/>
    <line x1="0" y1="6" x2="18" y2="6" stroke="{DRIFT}" stroke-width="1.5"/>
    <line x1="5" y1="0" x2="5" y2="-3" stroke="{DRIFT}" stroke-width="1.5"/>
    <line x1="13" y1="0" x2="13" y2="-3" stroke="{DRIFT}" stroke-width="1.5"/>
  </g>
  <text x="88" y="276"
    font-family="{FONT_MONO}" font-weight="400" font-size="14"
    fill="{DRIFT}"
  >{_e(date)}</text>
  <!-- Developments badge -->
  <rect x="60" y="320" width="80" height="30" rx="15" fill="{VERMILLION}"/>
  <text x="100" y="340" text-anchor="middle"
    font-family="{FONT_BODY}" font-weight="600" font-size="12"
    fill="{WARM_WHITE}"
  >{dev_count} developments</text>
{SVG_CLOSE}"""


# ═══════════════════════════════════════════════════════════════════════════
# In-article visual templates
# ═══════════════════════════════════════════════════════════════════════════


def stat_card(
    number: str,
    label: str,
    source: str,
    width: int = 400,
    height: int = 200,
) -> str:
    """Single big-number stat card."""
    cx = width // 2
    return f"""{_svg_open(width, height)}
  <rect width="{width}" height="{height}" rx="6" fill="{ONYX}"
    stroke="{EMBER}" stroke-opacity="0.2"/>
  <text x="{cx}" y="{height // 2 - 10}" text-anchor="middle"
    font-family="{FONT_HEADLINE}" font-weight="700" font-size="48"
    fill="{VERMILLION}"
  >{_e(number)}</text>
  <text x="{cx}" y="{height // 2 + 30}" text-anchor="middle"
    font-family="{FONT_BODY}" font-weight="400" font-size="14"
    fill="{CREAM}"
  >{_e(label)}</text>
  <text x="{cx}" y="{height - 16}" text-anchor="middle"
    font-family="{FONT_MONO}" font-weight="400" font-size="10"
    fill="{DRIFT}"
  >{_e(source)}</text>
{SVG_CLOSE}"""


def diagram_before_after(
    before_label: str,
    before_value: str,
    after_label: str,
    after_value: str,
    metric: str,
    source: str,
    width: int = 800,
    height: int = 250,
) -> str:
    """Side-by-side before/after comparison with arrow and delta."""
    card_w = 360
    gap = 20
    left_x = (width - card_w * 2 - gap) // 2
    right_x = left_x + card_w + gap
    card_h = height - 60  # leave room for source
    cy = card_h // 2 + 10

    # Tinted ghost borders
    red_tint = "#EF444433"
    green_tint = "#22C55E33"

    # Arrow center
    arrow_x = left_x + card_w + gap // 2
    arrow_y = cy

    return f"""{_svg_open(width, height)}
  <rect width="{width}" height="{height}" fill="{RICH_BLACK}"/>
  <!-- BEFORE card -->
  <rect x="{left_x}" y="10" width="{card_w}" height="{card_h}" rx="6"
    fill="{ONYX}" stroke="{RED}" stroke-opacity="0.2"/>
  <text x="{left_x + card_w // 2}" y="50" text-anchor="middle"
    font-family="{FONT_MONO}" font-weight="500" font-size="11"
    fill="{RED}" letter-spacing="2"
  >BEFORE</text>
  <text x="{left_x + card_w // 2}" y="{cy}" text-anchor="middle"
    font-family="{FONT_HEADLINE}" font-weight="700" font-size="36"
    fill="{WARM_WHITE}"
  >{_e(before_value)}</text>
  <text x="{left_x + card_w // 2}" y="{cy + 30}" text-anchor="middle"
    font-family="{FONT_BODY}" font-weight="400" font-size="12"
    fill="{DRIFT}"
  >{_e(before_label)}</text>
  <!-- Arrow -->
  <line x1="{arrow_x - 8}" y1="{arrow_y}" x2="{arrow_x + 8}" y2="{arrow_y}"
    stroke="{VERMILLION}" stroke-width="2" marker-end="url(#arrowhead)"/>
  <!-- AFTER card -->
  <rect x="{right_x}" y="10" width="{card_w}" height="{card_h}" rx="6"
    fill="{ONYX}" stroke="{GREEN}" stroke-opacity="0.2"/>
  <text x="{right_x + card_w // 2}" y="50" text-anchor="middle"
    font-family="{FONT_MONO}" font-weight="500" font-size="11"
    fill="{GREEN}" letter-spacing="2"
  >AFTER</text>
  <text x="{right_x + card_w // 2}" y="{cy}" text-anchor="middle"
    font-family="{FONT_HEADLINE}" font-weight="700" font-size="36"
    fill="{WARM_WHITE}"
  >{_e(after_value)}</text>
  <text x="{right_x + card_w // 2}" y="{cy + 30}" text-anchor="middle"
    font-family="{FONT_BODY}" font-weight="400" font-size="12"
    fill="{DRIFT}"
  >{_e(after_label)}</text>
  <!-- Metric label -->
  <text x="{width // 2}" y="{cy + 60}" text-anchor="middle"
    font-family="{FONT_MONO}" font-weight="400" font-size="11"
    fill="{VERMILLION}"
  >{_e(metric)}</text>
  <!-- Source -->
  <text x="{width // 2}" y="{height - 10}" text-anchor="middle"
    font-family="{FONT_MONO}" font-weight="400" font-size="10"
    fill="{DRIFT}"
  >{_e(source)}</text>
{SVG_CLOSE}"""


def diagram_process_flow(steps: list[str], width: int = 1000, height: int = 150) -> str:
    """Horizontal numbered-circle process flow."""
    n = len(steps)
    if n == 0:
        return f"""{_svg_open(width, height)}
  <rect width="{width}" height="{height}" fill="{RICH_BLACK}"/>
{SVG_CLOSE}"""

    padding = 60
    usable = width - 2 * padding
    spacing = usable / max(n - 1, 1) if n > 1 else 0
    r = 20
    cy = 60

    circles = []
    labels = []
    connectors = []

    for i, step in enumerate(steps):
        cx = padding + int(i * spacing) if n > 1 else width // 2
        # Connector line to next circle
        if i < n - 1:
            next_cx = padding + int((i + 1) * spacing)
            connectors.append(
                f'  <line x1="{cx + r}" y1="{cy}" '
                f'x2="{next_cx - r}" y2="{cy}" '
                f'stroke="{ONYX}" stroke-width="2"/>'
            )
            # Arrow tip
            connectors.append(
                f'  <polygon points="{next_cx - r},{cy} '
                f'{next_cx - r - 6},{cy - 4} '
                f'{next_cx - r - 6},{cy + 4}" fill="{VERMILLION}"/>'
            )
        # Circle
        circles.append(
            f'  <circle cx="{cx}" cy="{cy}" r="{r}" fill="{VERMILLION}"/>'
        )
        circles.append(
            f'  <text x="{cx}" y="{cy + 5}" text-anchor="middle" '
            f'font-family="{FONT_HEADLINE}" font-weight="700" font-size="14" '
            f'fill="{WARM_WHITE}">{i + 1}</text>'
        )
        # Label below
        label = _e(step[:20])
        labels.append(
            f'  <text x="{cx}" y="{cy + r + 24}" text-anchor="middle" '
            f'font-family="{FONT_BODY}" font-weight="400" font-size="11" '
            f'fill="{CREAM}">{label}</text>'
        )

    return f"""{_svg_open(width, height)}
  <rect width="{width}" height="{height}" fill="{RICH_BLACK}"/>
{"chr(10)".join(connectors) if connectors else ""}
{chr(10).join(circles)}
{chr(10).join(labels)}
{SVG_CLOSE}"""


def diagram_timeline(events: list[dict], width: int = 1000, height: int = 180) -> str:
    """Horizontal timeline with alternating above/below labels.

    *events*: list of {"date": str, "event": str}
    """
    n = len(events)
    if n == 0:
        return f"""{_svg_open(width, height)}
  <rect width="{width}" height="{height}" fill="{RICH_BLACK}"/>
{SVG_CLOSE}"""

    padding = 80
    usable = width - 2 * padding
    spacing = usable / max(n - 1, 1) if n > 1 else 0
    line_y = height // 2

    parts: list[str] = [
        f'{_svg_open(width, height)}',
        f'  <rect width="{width}" height="{height}" fill="{RICH_BLACK}"/>',
        # Main horizontal line
        f'  <line x1="{padding}" y1="{line_y}" x2="{width - padding}" y2="{line_y}" '
        f'stroke="{EMBER}" stroke-width="1"/>',
    ]

    for i, ev in enumerate(events):
        cx = padding + int(i * spacing) if n > 1 else width // 2
        parts.append(
            f'  <circle cx="{cx}" cy="{line_y}" r="5" fill="{VERMILLION}"/>'
        )
        above = i % 2 == 0
        date_y = line_y - 20 if above else line_y + 32
        event_y = line_y - 36 if above else line_y + 48
        if not above:
            date_y, event_y = line_y + 20, line_y + 36

        parts.append(
            f'  <text x="{cx}" y="{date_y}" text-anchor="middle" '
            f'font-family="{FONT_MONO}" font-weight="400" font-size="10" '
            f'fill="{DRIFT}">{_e(str(ev.get("date", "")))}</text>'
        )
        parts.append(
            f'  <text x="{cx}" y="{event_y}" text-anchor="middle" '
            f'font-family="{FONT_BODY}" font-weight="400" font-size="11" '
            f'fill="{CREAM}">{_e(str(ev.get("event", ""))[:30])}</text>'
        )

    parts.append(SVG_CLOSE)
    return "\n".join(parts)


def chart_bar_horizontal(
    data: list[dict],
    title: str,
    source: str,
    width: int = 800,
    height: int = 300,
) -> str:
    """Horizontal bar chart.

    *data*: list of {"label": str, "value": number}
    """
    if not data:
        return f"""{_svg_open(width, height)}
  <rect width="{width}" height="{height}" fill="{RICH_BLACK}"/>
{SVG_CLOSE}"""

    max_val = max(d.get("value", 0) for d in data) or 1
    n = len(data)
    top_margin = 50
    bottom_margin = 30
    label_col = 160
    value_col = width - 60
    bar_area = value_col - label_col - 20
    available_h = height - top_margin - bottom_margin
    bar_h = min(24, available_h // n - 6)
    gap = (available_h - bar_h * n) / max(n, 1)

    bars: list[str] = []
    for i, d in enumerate(data):
        label = _e(str(d.get("label", ""))[:20])
        val = d.get("value", 0)
        bar_w = int((val / max_val) * bar_area)
        y = top_margin + int(i * (bar_h + gap))
        text_y = y + bar_h // 2 + 4

        bars.append(
            f'  <text x="{label_col - 10}" y="{text_y}" text-anchor="end" '
            f'font-family="{FONT_BODY}" font-weight="400" font-size="12" '
            f'fill="{CREAM}">{label}</text>'
        )
        bars.append(
            f'  <rect x="{label_col}" y="{y}" width="{bar_w}" height="{bar_h}" '
            f'rx="2" fill="{VERMILLION}"/>'
        )
        bars.append(
            f'  <text x="{label_col + bar_w + 8}" y="{text_y}" '
            f'font-family="{FONT_MONO}" font-weight="400" font-size="12" '
            f'fill="{DRIFT}">{val}</text>'
        )

    return f"""{_svg_open(width, height)}
  <rect width="{width}" height="{height}" rx="6" fill="{RICH_BLACK}"
    stroke="{EMBER}" stroke-opacity="0.2"/>
  <!-- Title -->
  <text x="20" y="32"
    font-family="{FONT_HEADLINE}" font-weight="700" font-size="16"
    fill="{WARM_WHITE}"
  >{_e(title)}</text>
{chr(10).join(bars)}
  <!-- Source -->
  <text x="20" y="{height - 10}"
    font-family="{FONT_MONO}" font-weight="400" font-size="10"
    fill="{DRIFT}"
  >{_e(source)}</text>
{SVG_CLOSE}"""
