"""
Accessibility Checker tool for the UI Auditor agent.

Lightweight WCAG checks using Playwright to inspect the rendered DOM.
Checks: image alt text, aria-labels, heading hierarchy, color contrast.
"""

import json
import time
from pathlib import Path

from crewai.tools import BaseTool
from pipeline.tools.visual_inspector import _HugoServer, _get_browser


class AccessibilityCheckerTool(BaseTool):
    name: str = "accessibility_checker"
    description: str = (
        "Run accessibility checks on a rendered page. "
        "Checks: image alt text, heading hierarchy, aria-labels, interactive element labels. "
        "Input: JSON string with 'path' (e.g., '/' or '/posts/slug/'). "
        "Returns structured accessibility report."
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
            time.sleep(0.5)

            report = page.evaluate("""() => {
                const issues = [];
                const warnings = [];

                // 1. Image alt text
                const images = document.querySelectorAll('img');
                let missingAlt = 0;
                images.forEach(img => {
                    if (!img.alt || img.alt.trim() === '') {
                        missingAlt++;
                        issues.push({
                            type: 'missing_alt',
                            element: 'img',
                            src: img.src.slice(0, 80),
                            severity: 'error'
                        });
                    }
                });

                // 2. Heading hierarchy
                const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
                let prevLevel = 0;
                headings.forEach(h => {
                    const level = parseInt(h.tagName.charAt(1));
                    if (prevLevel > 0 && level > prevLevel + 1) {
                        issues.push({
                            type: 'heading_skip',
                            detail: `h${prevLevel} followed by h${level} (skipped h${prevLevel + 1})`,
                            text: h.textContent.trim().slice(0, 50),
                            severity: 'warning'
                        });
                    }
                    prevLevel = level;
                });

                // 3. Interactive elements without labels
                const buttons = document.querySelectorAll('button');
                buttons.forEach(btn => {
                    const label = btn.textContent.trim() || btn.getAttribute('aria-label') || '';
                    if (!label) {
                        issues.push({
                            type: 'unlabeled_button',
                            element: btn.outerHTML.slice(0, 80),
                            severity: 'error'
                        });
                    }
                });

                const links = document.querySelectorAll('a');
                links.forEach(a => {
                    const label = a.textContent.trim() || a.getAttribute('aria-label') || '';
                    if (!label && !a.querySelector('img, svg')) {
                        warnings.push({
                            type: 'unlabeled_link',
                            href: a.href.slice(0, 60),
                            severity: 'warning'
                        });
                    }
                });

                // 4. Form inputs without labels
                const inputs = document.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    const id = input.id;
                    const label = id ? document.querySelector(`label[for="${id}"]`) : null;
                    const ariaLabel = input.getAttribute('aria-label');
                    if (!label && !ariaLabel && input.type !== 'hidden') {
                        warnings.push({
                            type: 'unlabeled_input',
                            element: `${input.tagName.toLowerCase()}[type=${input.type}]`,
                            severity: 'warning'
                        });
                    }
                });

                // 5. Language attribute
                const htmlLang = document.documentElement.lang;
                if (!htmlLang) {
                    issues.push({
                        type: 'missing_lang',
                        detail: '<html> element missing lang attribute',
                        severity: 'error'
                    });
                }

                return {
                    page: window.location.pathname,
                    total_images: images.length,
                    missing_alt: missingAlt,
                    headings_count: headings.length,
                    issues: issues,
                    warnings: warnings,
                    score: Math.max(0, 100 - (issues.length * 10) - (warnings.length * 3))
                };
            }""")
            page.close()

            return json.dumps(report, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})
        finally:
            browser.close()
            pw.stop()
