"""
Playwright-based SVG-to-PNG renderer.
Renders SVG strings inside an HTML page with locally-loaded brand fonts,
then screenshots the viewport to produce a PNG.
"""

from __future__ import annotations

import asyncio
import re
from pathlib import Path

# Font directory relative to this file: ../../public/fonts
FONTS_DIR = Path(__file__).resolve().parents[2] / "public" / "fonts"


def intrinsic_svg_size(svg_content: str) -> tuple[int | None, int | None]:
    """Extract width/height attributes from an SVG's opening tag.

    Used so callers can render an SVG at its intrinsic size without
    hard-coding dimensions (critical for templates with dynamic height
    like diagram_timeline).
    """
    m_w = re.search(r'<svg[^>]*\bwidth="(\d+)"', svg_content)
    m_h = re.search(r'<svg[^>]*\bheight="(\d+)"', svg_content)
    w = int(m_w.group(1)) if m_w else None
    h = int(m_h.group(1)) if m_h else None
    return w, h


async def render_svg_to_png(
    svg_content: str,
    output_path: str,
    width: int = 1200,
    height: int = 627,
) -> str:
    """Render an SVG string to a PNG file using headless Chromium.

    Returns the *output_path* on success.
    Raises ``RuntimeError`` if Playwright browsers are not installed.
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError as exc:
        raise RuntimeError(
            "Playwright is not installed.  Run:  pip install playwright"
        ) from exc

    # Resolve font dir to a file:// URI (forward-slash even on Windows)
    fonts_uri = FONTS_DIR.as_uri()  # e.g. file:///C:/…/public/fonts

    html = f"""<!DOCTYPE html>
<html><head><style>
  @font-face {{
    font-family: 'Sora';
    src: url('{fonts_uri}/Sora-Bold.woff2') format('woff2');
    font-weight: 700;
  }}
  @font-face {{
    font-family: 'DM Sans';
    src: url('{fonts_uri}/DMSans-Regular.woff2') format('woff2');
    font-weight: 400;
  }}
  @font-face {{
    font-family: 'DM Sans';
    src: url('{fonts_uri}/DMSans-SemiBold.woff2') format('woff2');
    font-weight: 600;
  }}
  @font-face {{
    font-family: 'IBM Plex Mono';
    src: url('{fonts_uri}/IBMPlexMono-Regular.woff2') format('woff2');
    font-weight: 400;
  }}
  @font-face {{
    font-family: 'IBM Plex Mono';
    src: url('{fonts_uri}/IBMPlexMono-Medium.woff2') format('woff2');
    font-weight: 500;
  }}
  body {{ margin: 0; padding: 0; background: transparent; }}
</style></head><body>{svg_content}</body></html>"""

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page(
                viewport={"width": width, "height": height},
            )
            await page.set_content(html)
            await page.wait_for_timeout(500)  # allow fonts to load
            await page.screenshot(path=output_path, type="png")
            await browser.close()
    except Exception as exc:
        msg = str(exc)
        if "Executable doesn't exist" in msg or "browserType.launch" in msg:
            raise RuntimeError(
                "Playwright browsers are not installed.  Run:\n"
                "  python -m playwright install chromium"
            ) from exc
        raise

    return output_path


def render_sync(
    svg_content: str,
    output_path: str,
    width: int = 1200,
    height: int = 627,
) -> str:
    """Synchronous wrapper for pipeline use."""
    return asyncio.run(
        render_svg_to_png(svg_content, output_path, width, height)
    )
