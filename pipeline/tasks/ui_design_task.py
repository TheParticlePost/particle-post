"""
UI Designer task — 4-step process: read → evaluate → apply → log.
"""

from datetime import datetime, timezone

from crewai import Agent, Task


def build_ui_design_task(agent: Agent) -> Task:
    """
    Build the UI Designer's daily execution task.

    The agent reads current CSS/templates, evaluates each directive from the
    Marketing Director, applies approved changes, and outputs a change log.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    return Task(
        description=(
            f"Execute UI change directives for {today}.\n\n"

            "═══ STEP 1: READ CURRENT STATE ═══\n\n"

            "Call these tools to understand the current state of the site:\n"
            "1. css_reader('')          — read full custom.css\n"
            "2. template_reader('home_info')  — read hero section template\n"
            "3. template_reader('list')       — read post grid template (if directives target it)\n"
            "4. template_reader('header')     — read navigation template (if directives target it)\n"
            "5. template_reader('footer')     — read footer template (if directives target it)\n\n"
            "Only read templates that are referenced in your current directives context. "
            "If no directives target templates, skip the template reads.\n\n"

            "═══ STEP 2: EVALUATE EACH DIRECTIVE ═══\n\n"

            "For each directive listed in your CURRENT UI DIRECTIVES context:\n\n"
            "A. COOLDOWN CHECK\n"
            "   Look at RECENT UI CHANGE HISTORY. Has this component/property been changed "
            "   within the last 7 days? If yes → SKIP_COOLDOWN.\n\n"
            "B. CONSTRAINT CHECK\n"
            "   Does this directive touch --accent-blue, --accent-amber, or any other protected "
            "   brand element? If yes → SKIP_CONSTRAINT.\n\n"
            "C. RATIONALE CHECK\n"
            "   Is there a clear metric-backed reason for this change? If not → SKIP_NO_RATIONALE.\n\n"
            "D. FINDABILITY CHECK\n"
            "   Can you find the exact string to replace in the file content you read in Step 1? "
            "   If the string is not present verbatim → plan a SKIP with reason 'string not found'.\n\n"

            "═══ STEP 3: APPLY APPROVED CHANGES ═══\n\n"

            "For each directive classified as APPLY:\n\n"
            "1. Identify the EXACT current string from the file content (from Step 1)\n"
            "2. Determine the replacement string (one targeted change only)\n"
            "3. Call css_editor or template_editor with JSON:\n"
            '   {"find": "exact current string", "replace": "new string", "rationale": "..."}\n'
            "4. If the tool returns NOT FOUND, record it as skipped\n"
            "5. Re-read the file with css_reader or template_reader to confirm the change was applied\n\n"
            "Make changes one at a time. Do not batch multiple find/replace in a single call.\n\n"

            "═══ STEP 4: OUTPUT JSON ═══\n\n"

            "Output ONLY this JSON — no prose before or after, no markdown code fences:\n\n"
            "{\n"
            f'  "date": "{today}",\n'
            '  "changes_applied": [\n'
            '    {\n'
            '      "component": "e.g. post-card",\n'
            '      "property": "e.g. --gap",\n'
            '      "old_value": "24px",\n'
            '      "new_value": "28px",\n'
            '      "rationale": "bounce rate 82% — more whitespace reduces cognitive load"\n'
            '    }\n'
            '  ],\n'
            '  "changes_skipped": [\n'
            '    {\n'
            '      "component": "e.g. hero",\n'
            '      "property": "e.g. CTA text",\n'
            '      "reason": "SKIP_COOLDOWN — changed 3 days ago"\n'
            '    }\n'
            '  ],\n'
            '  "files_modified": ["blog/assets/css/extended/custom.css"],\n'
            '  "summary": "One sentence describing what was done and why"\n'
            "}\n\n"

            "If NO directives were approved (all skipped), output the JSON with empty "
            "changes_applied array and a clear summary explaining why nothing was changed.\n\n"

            "IMPORTANT: The JSON you output is written directly to ui_change_history.json "
            "and used by the Marketing Director in future sessions. Be accurate."
        ),
        expected_output=(
            "A single JSON object with: date, changes_applied (list of applied changes with "
            "component/property/old_value/new_value/rationale), changes_skipped (list with reason), "
            "files_modified (list of file paths), and summary. No prose outside the JSON."
        ),
        agent=agent,
    )
