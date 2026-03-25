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

            "═══ STEP 1: READ CURRENT STATE ═══\n\n"

            "Call these tools to understand the current site state:\n"
            "1. css_reader('')          — read full custom.css\n"
            "2. template_reader('home_info')  — read hero section\n"
            "3. template_reader('list')       — read post grid\n\n"
            "Review what you see. Identify areas that need improvement.\n\n"

            "═══ STEP 2: PICK BACKLOG ITEMS ═══\n\n"

            "From your UI IMPROVEMENT BACKLOG context, pick 1-2 items:\n"
            "- Prefer HIGH priority items first\n"
            "- Check RECENT UI CHANGE HISTORY — skip items whose component "
            "was changed within the last 7 days (cooldown)\n"
            "- If no suitable backlog items, identify a new improvement from your CSS/template audit\n\n"

            "═══ STEP 3: IMPLEMENT CHANGES ═══\n\n"

            "For each picked item:\n"
            "1. Find the exact current string in the file (from Step 1)\n"
            "2. Plan the improvement (one targeted change)\n"
            "3. Call css_editor or template_editor with find/replace/rationale\n"
            "4. Re-read the file to confirm the change was applied\n"
            "5. If editing CSS, verify dark mode is not broken\n\n"
            "Maximum 2 changes per run. Quality over quantity.\n\n"

            "═══ STEP 4: DISCOVER NEW ITEMS ═══\n\n"

            "Based on your audit in Step 1, identify 2-3 NEW improvement opportunities "
            "that are NOT already in the backlog. These become new backlog items.\n\n"

            "═══ STEP 5: OUTPUT JSON ═══\n\n"

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
            '  "summary": "Improved stat-box padding for better readability. Discovered 2 new improvement areas."\n'
            "}\n\n"

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
