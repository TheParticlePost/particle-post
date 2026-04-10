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
# Cover templates moved to TypeScript — see lib/covers/ (Playwright + HTML).
# The Python pipeline invokes the TS CLI via subprocess in pipeline/run.py.
# ═══════════════════════════════════════════════════════════════════════════


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


def diagram_timeline(events: list[dict], width: int = 800, height: int | None = None) -> str:
    """VERTICAL timeline — each event gets its own row with the date on
    the left, a vermillion marker on a central rail, and the full event
    description wrapping on the right. No truncation. Height scales to
    the number of events so text is never compressed.

    Layout per row:
        [  DATE  ] ● ─── [  Full event description, wraps freely  ]
           left    rail              right column

    *events*: list of {"date": str, "event": str}. Capped at 6.
    """
    events = events[:6]
    n = len(events)
    row_h = 110  # generous vertical room per event

    if n == 0:
        h = 120
        return f"""{_svg_open(width, h)}
  <rect width="{width}" height="{h}" fill="{RICH_BLACK}"/>
{SVG_CLOSE}"""

    # Dynamic height: top padding + n rows + bottom padding
    top_pad = 48
    bot_pad = 48
    h = top_pad + n * row_h + bot_pad
    if height is not None:
        h = max(h, height)

    # Column geometry
    date_col_w = 150       # left column for the date
    rail_x = 180           # x-coordinate of the vertical rail
    text_col_x = 220       # x where event text starts
    text_col_w = width - text_col_x - 40  # right padding 40

    parts: list[str] = [
        f'{_svg_open(width, h)}',
        f'  <rect width="{width}" height="{h}" fill="{RICH_BLACK}"/>',
        # Continuous vertical rail (behind markers)
        f'  <line x1="{rail_x}" y1="{top_pad}" x2="{rail_x}" y2="{h - bot_pad}" '
        f'stroke="{EMBER}" stroke-width="2"/>',
    ]

    # Approx 10 px per char at Sora Bold 18px in Chromium renders
    max_chars_per_line = max(28, int(text_col_w / 10.2))

    for i, ev in enumerate(events):
        row_center_y = top_pad + i * row_h + row_h // 2

        date = _e(str(ev.get("date", "")))
        event_text = _e(str(ev.get("event", "")))

        # Marker on the rail
        parts.append(
            f'  <circle cx="{rail_x}" cy="{row_center_y}" r="9" fill="{VERMILLION}" '
            f'stroke="{RICH_BLACK}" stroke-width="3"/>'
        )

        # Date (right-aligned in the left column, vertically centered)
        parts.append(
            f'  <text x="{rail_x - 22}" y="{row_center_y + 6}" text-anchor="end" '
            f'font-family="{FONT_MONO}" font-weight="500" font-size="14" '
            f'letter-spacing="0.06em" fill="{VERMILLION}">{date}</text>'
        )

        # Event text — wrap across up to 3 lines, left-aligned
        wrapped = _wrap_text(event_text, max_chars=max_chars_per_line)[:3]
        # Stack the wrapped lines vertically centered on the row center
        line_h = 24
        total_text_h = len(wrapped) * line_h
        first_baseline = row_center_y - total_text_h / 2 + 18
        for j, line in enumerate(wrapped):
            y = int(first_baseline + j * line_h)
            parts.append(
                f'  <text x="{text_col_x}" y="{y}" '
                f'font-family="{FONT_HEADLINE}" font-weight="700" font-size="18" '
                f'fill="{WARM_WHITE}">{line}</text>'
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
