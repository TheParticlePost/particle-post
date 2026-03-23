#!/usr/bin/env python3
"""
Particle Post — UI Designer Daily Run

Runs at 1pm ET via GitHub Actions (cron: 0 17 * * *).
Reads ui_directives.json (written by Marketing Director at noon),
executes CSS/template changes, and writes a change log entry.

Usage:
    python -m pipeline.ui_run

Exits cleanly (code 0) if no directives are pending — the GitHub Actions
workflow uses `git diff --staged --quiet` to skip commits on no-op days.
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_REPO_ROOT / ".env", override=True)

_CONFIG_DIR      = _REPO_ROOT / "pipeline" / "config"
_DIRECTIVES_FILE = _CONFIG_DIR / "ui_directives.json"
_HISTORY_FILE    = _CONFIG_DIR / "ui_change_history.json"


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _check_env() -> list[str]:
    required = ["ANTHROPIC_API_KEY"]
    return [v for v in required if not os.environ.get(v)]


def _check_should_run() -> bool:
    """Return False if no directives are pending (clean exit, no agent call)."""
    if not _DIRECTIVES_FILE.exists():
        print("  ui_directives.json not found — nothing to do.")
        return False
    try:
        data = json.loads(_DIRECTIVES_FILE.read_text(encoding="utf-8"))
        if not data.get("directives"):
            print("  No UI directives pending — Marketing Director issued none today.")
            return False
        print(f"  Found {len(data['directives'])} directive(s) from {data.get('generated_date', '?')}")
        return True
    except Exception as exc:
        print(f"  Error reading ui_directives.json: {exc}")
        return False


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[^\n]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.strip())
    return text.strip()


def _parse_json_output(raw: str) -> dict:
    """
    Robustly extract the UI Designer's JSON change log.
    Three-tier extraction with a safe fallback.
    """
    cleaned = _strip_code_fences(raw)

    # Tier 1: direct parse
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        pass

    # Tier 2: find first { ... } containing "date"
    match = re.search(r'\{[^{}]*"date"[^{}]*\}', cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except (json.JSONDecodeError, ValueError):
            pass

    # Tier 3: outermost braces
    start = cleaned.find("{")
    end   = cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start: end + 1])
        except (json.JSONDecodeError, ValueError):
            pass

    # Fallback
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"\n[WARN] UI Designer output could not be parsed as JSON.")
    print(f"  Raw (first 500 chars):\n  {raw[:500]}")
    return {
        "date": today,
        "changes_applied": [],
        "changes_skipped": [],
        "files_modified": [],
        "summary": "Output parse failed — no changes recorded.",
    }


def _write_change_log(output: dict) -> None:
    """Append today's change log to ui_change_history.json (keep last 90 entries)."""
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    if _HISTORY_FILE.exists():
        try:
            data = json.loads(_HISTORY_FILE.read_text(encoding="utf-8"))
        except Exception:
            data = {"changes": []}
    else:
        data = {"changes": []}

    data["changes"].append(output)
    data["changes"] = data["changes"][-90:]

    _HISTORY_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  Change log written to ui_change_history.json")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — UI DESIGNER")
    print(f"  {today}")
    print(f"{'='*60}\n")

    missing = _check_env()
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)

    if not _check_should_run():
        print(f"\n{'='*60}")
        print("  UI DESIGNER: Nothing to do today.")
        print(f"{'='*60}\n")
        sys.exit(0)

    from crewai import Crew, Process
    from pipeline.agents.ui_designer import build_ui_designer
    from pipeline.tasks.ui_design_task import build_ui_design_task

    designer = build_ui_designer()
    task     = build_ui_design_task(designer)

    crew = Crew(
        agents=[designer],
        tasks=[task],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff()
    raw    = result.raw if result.raw else ""

    print(f"\n{'='*60}")
    print("  PARSING UI DESIGNER OUTPUT")
    print(f"{'='*60}\n")

    output = _parse_json_output(raw)

    applied = output.get("changes_applied", [])
    skipped = output.get("changes_skipped", [])
    summary = output.get("summary", "")

    print(f"  Changes applied : {len(applied)}")
    print(f"  Changes skipped : {len(skipped)}")
    print(f"  Summary         : {summary}")

    if applied:
        print("\n  Applied changes:")
        for c in applied:
            print(f"    • {c.get('component')} / {c.get('property')}: "
                  f"{c.get('old_value')} → {c.get('new_value')}")

    if skipped:
        print("\n  Skipped directives:")
        for s in skipped:
            print(f"    • {s.get('component')} / {s.get('property')}: {s.get('reason')}")

    _write_change_log(output)

    print(f"\n{'='*60}")
    print(f"  UI DESIGNER COMPLETE — {len(applied)} change(s) applied")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
