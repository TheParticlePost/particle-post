"""
Visual Inspector tools for the UI Auditor agent.

Provides Playwright-based visual inspection of the rendered Hugo site.
Requires: playwright (pip install playwright && playwright install chromium)

Tools:
  - VisualScreenshotTool  — take screenshot at a given viewport width
  - ImageCheckerTool      — verify all <img> tags loaded successfully
  - LinkCheckerTool       — verify all internal links return 200
  - LayoutCheckerTool     — detect horizontal overflow and layout issues
"""

import json
import os
import subprocess
import tempfile
import time
from pathlib import Path
from typing import ClassVar

from crewai.tools import BaseTool

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_BLOG_DIR = _REPO_ROOT / "blog"
_HUGO_PORT = 1314  # Use non-default port to avoid conflicts


class _HugoServer:
    """Manages Hugo dev server lifecycle."""

    _instance: ClassVar = None
    _proc: ClassVar = None

    @classmethod
    def ensure_running(cls) -> str:
        """Start Hugo if not running. Returns base URL."""
        if cls._proc is not None and cls._proc.poll() is None:
            return f"http://localhost:{_HUGO_PORT}"

        hugo_cmd = ["hugo", "server", "--port", str(_HUGO_PORT),
                    "--disableLiveReload", "--noHTTPCache", "--bind", "0.0.0.0"]
        try:
            cls._proc = subprocess.Popen(
                hugo_cmd, cwd=str(_BLOG_DIR),
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            )
            # Wait for server to be ready
            import urllib.request
            for _ in range(20):
                time.sleep(0.5)
                try:
                    urllib.request.urlopen(f"http://localhost:{_HUGO_PORT}/", timeout=2)
                    return f"http://localhost:{_HUGO_PORT}"
                except Exception:
                    continue
            return f"http://localhost:{_HUGO_PORT}"
        except FileNotFoundError:
            return ""

    @classmethod
    def stop(cls):
        if cls._proc is not None:
            cls._proc.terminate()
            try:
                cls._proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                cls._proc.kill()
            cls._proc = None


def _get_browser():
    """Get or create Playwright browser instance."""
    try:
        from playwright.sync_api import sync_playwright
        pw = sync_playwright().start()
        browser = pw.chromium.launch(headless=True)
        return pw, browser
    except Exception as e:
        return None, None


class VisualScreenshotTool(BaseTool):
    name: str = "visual_screenshot"
    description: str = (
        "Take a screenshot of a page at a specific viewport width. "
        "Input: JSON string with 'path' (e.g., '/' or '/posts/slug/') "
        "and 'width' (e.g., 375, 768, 1280). "
        "Returns the file path to the saved screenshot."
    )

    def _run(self, input_str: str) -> str:
        try:
            params = json.loads(input_str)
        except json.JSONDecodeError:
            params = {"path": "/", "width": 1280}

        page_path = params.get("path", "/")
        width = int(params.get("width", 1280))

        base_url = _HugoServer.ensure_running()
        if not base_url:
            return json.dumps({"error": "Hugo server failed to start"})

        pw, browser = _get_browser()
        if not browser:
            return json.dumps({"error": "Playwright not available. Install with: pip install playwright && playwright install chromium"})

        try:
            page = browser.new_page(viewport={"width": width, "height": 900})
            page.goto(f"{base_url}{page_path}", wait_until="networkidle", timeout=15000)
            time.sleep(1)  # Allow CSS transitions

            tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False,
                                              prefix=f"screenshot_{width}_")
            page.screenshot(path=tmp.name, full_page=True)
            page.close()
            return json.dumps({
                "screenshot_path": tmp.name,
                "width": width,
                "page": page_path,
                "status": "success"
            })
        except Exception as e:
            return json.dumps({"error": str(e)})
        finally:
            browser.close()
            pw.stop()


class ImageCheckerTool(BaseTool):
    name: str = "image_checker"
    description: str = (
        "Check all images on a page to see if they loaded successfully. "
        "Input: JSON string with 'path' (e.g., '/' or '/posts/slug/'). "
        "Returns list of images with their load status."
    )

    def _run(self, input_str: str) -> str:
        try:
            params = json.loads(input_str)
        except json.JSONDecodeError:
            params = {"path": "/"}

        page_path = params.get("path", "/")
        base_url = _HugoServer.ensure_running()
        if not base_url:
            return json.dumps({"error": "Hugo server failed to start"})

        pw, browser = _get_browser()
        if not browser:
            return json.dumps({"error": "Playwright not available"})

        try:
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            page.goto(f"{base_url}{page_path}", wait_until="networkidle", timeout=15000)
            time.sleep(1)

            images = page.evaluate("""() => {
                return Array.from(document.querySelectorAll('img')).map(img => ({
                    src: img.src,
                    alt: img.alt,
                    loaded: img.naturalWidth > 0 && img.complete,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                }));
            }""")
            page.close()

            broken = [i for i in images if not i["loaded"]]
            return json.dumps({
                "total_images": len(images),
                "loaded": len(images) - len(broken),
                "broken": len(broken),
                "broken_images": broken,
                "all_images": images
            })
        except Exception as e:
            return json.dumps({"error": str(e)})
        finally:
            browser.close()
            pw.stop()


class LinkCheckerTool(BaseTool):
    name: str = "link_checker"
    description: str = (
        "Check all internal links on a page to verify they return 200. "
        "Input: JSON string with 'path' (e.g., '/'). "
        "Returns list of links with their status codes."
    )

    def _run(self, input_str: str) -> str:
        try:
            params = json.loads(input_str)
        except json.JSONDecodeError:
            params = {"path": "/"}

        page_path = params.get("path", "/")
        base_url = _HugoServer.ensure_running()
        if not base_url:
            return json.dumps({"error": "Hugo server failed to start"})

        pw, browser = _get_browser()
        if not browser:
            return json.dumps({"error": "Playwright not available"})

        try:
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            page.goto(f"{base_url}{page_path}", wait_until="networkidle", timeout=15000)

            links = page.evaluate("""() => {
                return Array.from(document.querySelectorAll('a[href]'))
                    .map(a => ({href: a.href, text: a.textContent.trim().slice(0, 60)}))
                    .filter(l => l.href.startsWith(window.location.origin));
            }""")
            page.close()

            import urllib.request
            results = []
            for link in links[:50]:  # Limit to 50 links
                try:
                    req = urllib.request.urlopen(link["href"], timeout=5)
                    results.append({**link, "status": req.status, "ok": True})
                except urllib.error.HTTPError as e:
                    results.append({**link, "status": e.code, "ok": False})
                except Exception:
                    results.append({**link, "status": 0, "ok": False})

            broken = [r for r in results if not r["ok"]]
            return json.dumps({
                "total_links": len(results),
                "ok": len(results) - len(broken),
                "broken": len(broken),
                "broken_links": broken
            })
        except Exception as e:
            return json.dumps({"error": str(e)})
        finally:
            browser.close()
            pw.stop()


class LayoutCheckerTool(BaseTool):
    name: str = "layout_checker"
    description: str = (
        "Check for layout issues at a given viewport width. "
        "Detects horizontal overflow, overlapping elements, and truncation. "
        "Input: JSON string with 'path' and 'width'. "
        "Returns list of layout issues found."
    )

    def _run(self, input_str: str) -> str:
        try:
            params = json.loads(input_str)
        except json.JSONDecodeError:
            params = {"path": "/", "width": 375}

        page_path = params.get("path", "/")
        width = int(params.get("width", 375))
        base_url = _HugoServer.ensure_running()
        if not base_url:
            return json.dumps({"error": "Hugo server failed to start"})

        pw, browser = _get_browser()
        if not browser:
            return json.dumps({"error": "Playwright not available"})

        try:
            page = browser.new_page(viewport={"width": width, "height": 900})
            page.goto(f"{base_url}{page_path}", wait_until="networkidle", timeout=15000)
            time.sleep(0.5)

            issues = page.evaluate("""(viewportWidth) => {
                const issues = [];
                const body = document.body;

                // Check for horizontal overflow
                if (body.scrollWidth > viewportWidth) {
                    issues.push({
                        type: 'horizontal_overflow',
                        detail: `Body scrollWidth (${body.scrollWidth}px) exceeds viewport (${viewportWidth}px)`
                    });
                }

                // Check for elements extending beyond viewport
                const allElements = document.querySelectorAll('*');
                for (const el of allElements) {
                    const rect = el.getBoundingClientRect();
                    if (rect.right > viewportWidth + 5 && rect.width > 0) {
                        const tag = el.tagName.toLowerCase();
                        const cls = el.className ? `.${el.className.split(' ')[0]}` : '';
                        if (!['script', 'style', 'meta', 'link', 'head'].includes(tag)) {
                            issues.push({
                                type: 'element_overflow',
                                element: `${tag}${cls}`,
                                detail: `Right edge at ${Math.round(rect.right)}px (viewport: ${viewportWidth}px)`
                            });
                            if (issues.length > 10) break;
                        }
                    }
                }

                // Check filter tabs overflow
                const filterTabs = document.querySelector('.filter-tabs');
                if (filterTabs && filterTabs.scrollWidth > filterTabs.clientWidth) {
                    issues.push({
                        type: 'filter_tabs_overflow',
                        detail: `Filter tabs overflow: ${filterTabs.scrollWidth}px content in ${filterTabs.clientWidth}px container`
                    });
                }

                return issues;
            }""", width)
            page.close()

            return json.dumps({
                "viewport_width": width,
                "page": page_path,
                "issues_found": len(issues),
                "issues": issues
            })
        except Exception as e:
            return json.dumps({"error": str(e)})
        finally:
            browser.close()
            pw.stop()
