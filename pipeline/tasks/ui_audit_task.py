"""
UI Audit task — proactive mode: read → pick from backlog → implement → discover new items.
"""

from datetime import datetime, timezone

from crewai import Agent, Task


def build_ui_audit_task(agent: Agent) -> Task:
    """
    Build the UI Auditor's proactive task.

    The agent reads CSS/templates, picks 1-2 items from the backlog,
    implements them, and identifies new improvement opportunities.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return Task(
        description=(
            f"Proactive UI audit and improvement for {today}.\n\n"

            "═══ STEP 1: VISUAL INSPECTION ═══\n\n"

            "Use visual tools to SEE the rendered website (if available):\n"
            "1. visual_screenshot({\"path\": \"/\", \"width\": 1280})  — homepage desktop\n"
            "2. visual_screenshot({\"path\": \"/\", \"width\": 375})   — homepage mobile\n"
            "3. image_checker({\"path\": \"/\"})  — check all images loaded\n"
            "4. link_checker({\"path\": \"/\"})   — check internal links\n"
            "5. layout_checker({\"path\": \"/\", \"width\": 375})  — mobile layout issues\n"
            "6. accessibility_checker({\"path\": \"/\"})  — alt text, headings, aria-labels\n\n"
            "If visual tools error (Playwright not installed), log it and skip to Step 3.\n\n"

            "═══ STEP 2: VISUAL ANALYSIS ═══\n\n"

            "Review visual inspection results. Flag critical issues:\n"
            "- Broken images (naturalWidth=0) — HIGH priority\n"
            "- Dead internal links (status != 200) — HIGH priority\n"
            "- Layout overflow on mobile — HIGH priority\n"
            "- Missing alt text or heading skips — MEDIUM priority\n"
            "- These visual findings override backlog priorities.\n\n"

            "═══ STEP 3: READ CSS/TEMPLATES ═══\n\n"

            "Call these tools to understand the current code state:\n"
            "1. css_reader('')          — read full custom.css\n"
            "2. template_reader('home_info')  — read hero section\n"
            "3. template_reader('list')       — read post grid\n\n"

            "═══ STEP 4: PICK ISSUE TO FIX ═══\n\n"

            "Priority order:\n"
            "1. Critical visual issues from Step 2 (broken images, dead links, overflow)\n"
            "2. HIGH-priority backlog items\n"
            "3. Accessibility issues from visual inspection\n"
            "4. New improvements identified from CSS/template audit\n\n"
            "Check RECENT UI CHANGE HISTORY — skip items changed within 7 days.\n\n"

            "═══ STEP 5: IMPLEMENT CHANGES ═══\n\n"

            "For each picked item:\n"
            "1. Find the exact current string in the file (from Step 3)\n"
            "2. Plan the improvement (one targeted change)\n"
            "3. Call css_editor or template_editor with find/replace/rationale\n"
            "4. Re-read the file to confirm the change was applied\n"
            "5. If editing CSS, verify dark mode is not broken\n\n"
            "Maximum 2 changes per run. Quality over quantity.\n\n"

            "═══ STEP 6: VERIFY (if visual tools available) ═══\n\n"

            "Re-take screenshots at the same breakpoints as Step 1.\n"
            "Confirm the fix is visible and no regressions were introduced.\n\n"

            "═══ STEP 7: DISCOVER NEW ITEMS ═══\n\n"

            "Based on visual inspection AND CSS/template audit, identify 2-3 NEW "
            "improvement opportunities not already in the backlog.\n\n"

            "═══ STEP 8: OUTPUT JSON ═══\n\n"

            "Output ONLY this JSON — no prose before or after, no code fences:\n\n"
            "{\n"
            f'  "date": "{today}",\n'
            '  "mode": "audit",\n'
            '  "changes_applied": [\n'
            '    {\n'
            '      "backlog_id": "UI-001 or null if new discovery",\n'
            '      "component": "e.g. stat-box",\n'
            '      "property": "e.g. padding",\n'
            '      "old_value": "12px",\n'
            '      "new_value": "16px",\n'
            '      "rationale": "Improve readability by increasing stat-box padding"\n'
            '    }\n'
            '  ],\n'
            '  "changes_skipped": [\n'
            '    {\n'
            '      "backlog_id": "UI-002",\n'
            '      "reason": "SKIP_COOLDOWN — component changed 3 days ago"\n'
            '    }\n'
            '  ],\n'
            '  "new_backlog_items": [\n'
            '    {\n'
            '      "component": "article-images",\n'
            '      "description": "Image border-radius inconsistent between card and article views",\n'
            '      "priority": "medium"\n'
            '    }\n'
            '  ],\n'
            '  "files_modified": ["blog/assets/css/extended/custom.css"],\n'
            '  "visual_check": {\n'
            '    "screenshots_taken": true,\n'
            '    "broken_images": 0,\n'
            '    "broken_links": 0,\n'
            '    "layout_issues": 0,\n'
            '    "accessibility_score": 100,\n'
            '    "notes": "All images loaded. No layout overflow at 375px."\n'
            '  },\n'
            '  "summary": "Improved stat-box padding for better readability. Discovered 2 new improvement areas."\n'
            "}\n\n"
            "If visual tools were not available, set visual_check.screenshots_taken to false "
            "and notes to 'Playwright not available — visual inspection skipped'.\n\n"

            "If no changes were possible (all on cooldown), output empty changes_applied "
            "but still include new_backlog_items from your audit."
        ),
        expected_output=(
            "A single JSON object with: date, mode ('audit'), changes_applied, "
            "changes_skipped, new_backlog_items, files_modified, and summary. "
            "No prose outside the JSON."
        ),
        agent=agent,
    )
