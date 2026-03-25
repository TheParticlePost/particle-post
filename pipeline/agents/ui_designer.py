"""
UI Designer agent — executes CSS and template changes directed by the Marketing Director.

Reads ui_directives.json (written by Marketing Director at noon) and makes targeted,
reversible changes to custom.css and Hugo template files to improve engagement metrics.

Enforces:
  - Brand color protection (--accent-blue, --accent-amber never modified)
  - Dark mode compatibility (changes must not break [data-theme="dark"])
  - 7-day cooldown (no re-changing a component changed recently)
  - Metric-backed rationale required for every directive applied
"""

import json
from datetime import datetime, timezone
from pathlib import Path

from crewai import Agent, LLM

from pipeline.tools.css_editor import (
    CSSEditorTool,
    CSSReaderTool,
    TemplateEditorTool,
    TemplateReaderTool,
)

_CONFIG_DIR    = Path(__file__).resolve().parent.parent / "config"
_PROMPTS_DIR   = Path(__file__).resolve().parent.parent / "prompts"
_DIRECTIVES    = _CONFIG_DIR / "ui_directives.json"
_HISTORY       = _CONFIG_DIR / "ui_change_history.json"
_BACKLOG       = _CONFIG_DIR / "ui_backlog.json"
_DESIGN_PRINCIPLES = _PROMPTS_DIR / "ui_design_principles.txt"


def _load_ui_directives() -> str:
    """Format current UI directives for the agent's backstory."""
    if not _DIRECTIVES.exists():
        return "(No UI directives file found — nothing to do.)"
    try:
        data = json.loads(_DIRECTIVES.read_text(encoding="utf-8"))
        directives = data.get("directives", [])
        if not directives:
            return "(No UI directives pending — Marketing Director issued none today.)"

        lines = [
            f"Generated: {data.get('generated_date', '?')}",
            f"Trigger metric: {data.get('trigger_metric', '?')} = {data.get('trigger_value', '?')}",
            f"Target metric to improve: {data.get('target_metric', '?')}",
            f"Evaluation period: {data.get('evaluation_period_days', 7)} days",
            "",
            f"DIRECTIVES ({len(directives)} total):",
        ]
        for i, d in enumerate(directives, 1):
            lines.append(
                f"  {i}. Component: {d.get('component', '?')} | "
                f"Change: {d.get('change_type', '?')} | "
                f"Property: {d.get('property', '?')} | "
                f"Rationale: {d.get('rationale', '?')}"
            )
        constraints = data.get("constraints", [])
        if constraints:
            lines.append("")
            lines.append("CONSTRAINTS (hard rules, never violate):")
            for c in constraints:
                lines.append(f"  • {c}")
        return "\n".join(lines)
    except Exception as exc:
        return f"(Error loading directives: {exc})"


def _load_ui_change_history() -> str:
    """Format recent UI change history for 7-day cooldown enforcement."""
    if not _HISTORY.exists():
        return "(No UI change history yet — all components are available.)"
    try:
        data  = json.loads(_HISTORY.read_text(encoding="utf-8"))
        changes = data.get("changes", [])
        if not changes:
            return "(No UI changes recorded yet — all components are available.)"

        recent = changes[-10:]
        today  = datetime.now(timezone.utc).date()
        lines  = [f"RECENT UI CHANGES (last {len(recent)} runs):"]
        for entry in recent:
            date_str = entry.get("date", "?")
            applied  = entry.get("changes_applied", [])
            for c in applied:
                lines.append(
                    f"  [{date_str}] {c.get('component', '?')} — "
                    f"{c.get('property', '?')} changed to {c.get('new_value', '?')}"
                )
        lines.append("")
        lines.append(
            "COOLDOWN RULE: Do not re-change any component/property changed within the last 7 days. "
            "Check dates carefully before applying each directive."
        )
        return "\n".join(lines)
    except Exception as exc:
        return f"(Error loading change history: {exc})"


def _load_design_principles(max_chars: int = 0) -> str:
    """Load the design system reference from the shared principles file.

    Args:
        max_chars: If > 0, truncate to this many characters (for rate-limit safety).
                   0 means return the full file (used by directive mode on Sonnet).
    """
    if not _DESIGN_PRINCIPLES.exists():
        return "(Design principles file not found — apply general CSS best practices.)"
    content = _DESIGN_PRINCIPLES.read_text(encoding="utf-8")
    if max_chars and len(content) > max_chars:
        content = content[:max_chars] + "\n(... truncated for token budget)"
    return content


def _load_ui_backlog() -> str:
    """Load the UI improvement backlog for proactive audit mode."""
    if not _BACKLOG.exists():
        return "(No UI backlog found — identify improvements from CSS/template audit.)"
    try:
        data = json.loads(_BACKLOG.read_text(encoding="utf-8"))
        pending = [item for item in data.get("backlog", []) if item.get("status") == "pending"]
        if not pending:
            return "(All backlog items completed — identify new improvements from audit.)"
        lines = [f"UI BACKLOG ({len(pending)} pending items, sorted by priority):"]
        # Sort: high first, then medium, then low
        priority_order = {"high": 0, "medium": 1, "low": 2}
        pending.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 3))
        for item in pending[:10]:
            lines.append(
                f"  [{item.get('id', '?')}] {item.get('component', '?')} — "
                f"{item.get('description', '?')} (priority: {item.get('priority', '?')})"
            )
        return "\n".join(lines)
    except Exception as exc:
        return f"(Error loading backlog: {exc})"


def build_ui_designer() -> Agent:
    """
    Build the UI Designer agent.

    Runs daily at 1pm ET after the Marketing Director's noon analysis.
    Reads ui_directives.json and makes targeted CSS/template edits to improve
    engagement metrics (time on page, bounce rate, navigation).

    Uses claude-sonnet-4-6 — file editing requires careful reasoning.
    """
    directives = _load_ui_directives()
    history    = _load_ui_change_history()
    principles = _load_design_principles()

    return Agent(
        role="UI Designer",
        goal=(
            "Execute UI change directives from the Marketing Director by making precise, "
            "targeted edits to the site's CSS variables and Hugo templates. "
            "Document every change made and every directive skipped with a clear reason."
        ),
        backstory=(
            "You are the UI Designer at Particle Post. You receive data-driven directives "
            "from the Marketing Director and implement specific CSS and template changes "
            "to improve engagement metrics like time on page, bounce rate, and navigation depth.\n\n"
            "═══ DESIGN SYSTEM REFERENCE ═══\n\n"
            f"{principles}\n\n"
            "═══ CRITICAL CONSTRAINTS (enforce always) ═══\n\n"
            "1. NEVER modify --accent-blue (#2563EB) or --accent-amber (#F59E0B). "
            "   These are protected brand colors. The css_editor tool will block attempts, "
            "   but you must also refuse at the reasoning level.\n\n"
            "2. NEVER break dark mode. After any CSS change, mentally verify that the "
            "   [data-theme='dark'] override block in custom.css still provides adequate "
            "   contrast. The dark mode block must remain intact.\n\n"
            "3. ENFORCE the 7-day cooldown. Check the UI change history before applying "
            "   any directive. If a component/property was changed within 7 days, skip it "
            "   with reason 'SKIP_COOLDOWN'.\n\n"
            "4. METRIC-BACKED RATIONALE required. Only apply directives that have a clear "
            "   metric-backed reason from the Marketing Director. Do not invent changes.\n\n"
            "5. SMALL and REVERSIBLE. Each change must be minimal — one CSS variable, "
            "   one text string, one padding value. Every change must be undoable via git revert.\n\n"
            "═══ PROCESS (follow exactly) ═══\n\n"
            "STEP 1 — READ CURRENT STATE:\n"
            "  Call css_reader to get the full current CSS.\n"
            "  Call template_reader for any template mentioned in the directives.\n\n"
            "STEP 2 — EVALUATE EACH DIRECTIVE:\n"
            "  For each directive, classify as one of:\n"
            "  • APPLY            — passes all checks (cooldown, constraints, rationale)\n"
            "  • SKIP_COOLDOWN    — component changed within last 7 days\n"
            "  • SKIP_CONSTRAINT  — violates brand color or dark mode rules\n"
            "  • SKIP_NO_RATIONALE— no clear metric-backed reason\n\n"
            "STEP 3 — APPLY APPROVED CHANGES:\n"
            "  For each APPLY directive:\n"
            "  a. Find the exact current string in the file (from Step 1 read)\n"
            "  b. Construct the replacement string\n"
            "  c. Call css_editor or template_editor with find/replace/rationale\n"
            "  d. If the tool returns NOT FOUND, log it as skipped and move on\n"
            "  e. Re-read the file to confirm the change was applied\n\n"
            "STEP 4 — OUTPUT CHANGE LOG JSON (no prose, no code fences):\n"
            "  Output ONLY the JSON object described in the task.\n\n"
            "═══ CURRENT UI DIRECTIVES ═══\n\n"
            f"{directives}\n\n"
            "═══ RECENT UI CHANGE HISTORY ═══\n\n"
            f"{history}"
        ),
        tools=[
            CSSReaderTool(),
            CSSEditorTool(),
            TemplateReaderTool(),
            TemplateEditorTool(),
        ],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=4000),
        verbose=True,
        allow_delegation=False,
    )


def build_ui_auditor() -> Agent:
    """
    Build the UI Auditor agent — proactive mode.

    Runs 3x/day independently of the Marketing Director.
    Reads CSS + templates, picks items from the UI backlog (or identifies
    new improvements), implements 1-2 changes per run, and updates the backlog.

    Uses Haiku 4.5 to stay within API rate limits (30K tokens/min on Sonnet).
    The auditor's job is read → pick → small edit — Haiku handles this well.
    """
    principles = _load_design_principles(max_chars=1500)  # trimmed for token budget
    history    = _load_ui_change_history()
    backlog    = _load_ui_backlog()

    return Agent(
        role="UI Auditor",
        goal=(
            "Proactively improve the Particle Post website by auditing CSS and templates, "
            "picking the highest-impact improvement from the backlog (or identifying new ones), "
            "and implementing 1-2 targeted, reversible changes per run. "
            "After making changes, add 2-3 new backlog items you identified during audit."
        ),
        backstory=(
            "You are the UI Auditor at Particle Post. Unlike the directive-driven UI Designer, "
            "you work PROACTIVELY — you read the site's CSS and templates, identify what needs "
            "improvement, and make targeted changes without waiting for instructions.\n\n"
            "Your priorities (in order):\n"
            "1. HIGH-priority backlog items first\n"
            "2. Accessibility issues (contrast, touch targets, focus states)\n"
            "3. Mobile experience (375px and 768px breakpoints)\n"
            "4. Visual hierarchy (headings, spacing, typography)\n"
            "5. Dark mode polish\n"
            "6. Component consistency\n"
            "7. Micro-interactions and hover states\n\n"
            "═══ DESIGN SYSTEM REFERENCE ═══\n\n"
            f"{principles}\n\n"
            "═══ CRITICAL CONSTRAINTS (same as UI Designer) ═══\n\n"
            "1. NEVER modify --accent-blue (#2563EB) or --accent-amber (#F59E0B).\n"
            "2. NEVER break dark mode. Verify [data-theme='dark'] after any change.\n"
            "3. ENFORCE 7-day cooldown. Check history before changing any component.\n"
            "4. SMALL and REVERSIBLE. One change at a time. Undoable via git revert.\n"
            "5. Maximum 2 changes per run. Quality over quantity.\n\n"
            "═══ PROCESS ═══\n\n"
            "STEP 1 — READ: Call css_reader for full CSS. Read 2-3 relevant templates.\n"
            "STEP 2 — PICK: Choose 1-2 items from the backlog (highest priority pending).\n"
            "         If no backlog items are suitable, identify new improvements.\n"
            "STEP 3 — IMPLEMENT: Make targeted CSS/template changes.\n"
            "STEP 4 — DISCOVER: Identify 2-3 NEW improvement opportunities for the backlog.\n"
            "STEP 5 — OUTPUT: JSON change log + new backlog items.\n\n"
            "═══ UI IMPROVEMENT BACKLOG ═══\n\n"
            f"{backlog}\n\n"
            "═══ RECENT UI CHANGE HISTORY ═══\n\n"
            f"{history}"
        ),
        tools=[
            CSSReaderTool(),
            CSSEditorTool(),
            TemplateReaderTool(),
            TemplateEditorTool(),
        ],
        llm=LLM(model="anthropic/claude-haiku-4-5-20251001", max_tokens=4000),
        verbose=True,
        allow_delegation=False,
    )
