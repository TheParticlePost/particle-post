#!/usr/bin/env python3
"""
Particle Post — UI Designer Runner (Two Modes)

Supports two modes:
  --mode directive : (default for ui-designer.yml) Reads ui_directives.json from Marketing Director.
                     Exits cleanly if no directives pending.
  --mode audit     : (default for ui-proactive.yml) Proactive self-auditing mode.
                     Always runs — picks from UI backlog or discovers improvements.

Usage:
    python -m pipeline.ui_run --mode directive
    python -m pipeline.ui_run --mode audit
    python -m pipeline.ui_run                    # defaults to audit mode
"""

import argparse
import json
import os
import re
import sys
import time
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
_BACKLOG_FILE    = _CONFIG_DIR / "ui_backlog.json"


# ──────────────────────────────────────────────────────────────────────────────
# Rate-limit retry wrapper
# ──────────────────────────────────────────────────────────────────────────────

def _kickoff_with_retry(crew, max_retries: int = 3):
    """Run crew.kickoff() with automatic retry on 429 rate limit errors."""
    for attempt in range(1, max_retries + 1):
        try:
            return crew.kickoff()
        except Exception as exc:
            if "429" in str(exc) or "rate_limit" in str(exc).lower():
                wait = 60 * attempt  # 60s, 120s, 180s
                print(f"  [RATE LIMIT] Hit API rate limit. Waiting {wait}s before retry {attempt}/{max_retries}...")
                time.sleep(wait)
                if attempt == max_retries:
                    raise
            else:
                raise


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _check_env() -> list[str]:
    required = ["ANTHROPIC_API_KEY"]
    return [v for v in required if not os.environ.get(v)]


def _check_should_run_directive() -> bool:
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
    Robustly extract the UI Designer/Auditor JSON change log.
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
    print(f"\n[WARN] UI output could not be parsed as JSON.")
    print(f"  Raw (first 500 chars):\n  {raw[:500]}")
    return {
        "date": today,
        "changes_applied": [],
        "changes_skipped": [],
        "files_modified": [],
        "summary": "Output parse failed — no changes recorded.",
    }


def _write_change_log(output: dict) -> None:
    """Append change log to ui_change_history.json (keep last 90 entries)."""
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


def _update_backlog(output: dict) -> None:
    """
    Update ui_backlog.json after an audit run:
    - Mark completed backlog items
    - Add new backlog items discovered during audit
    """
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    if _BACKLOG_FILE.exists():
        try:
            data = json.loads(_BACKLOG_FILE.read_text(encoding="utf-8"))
        except Exception:
            data = {"backlog": [], "completed": []}
    else:
        data = {"backlog": [], "completed": []}

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Mark applied backlog items as completed
    applied_ids = {
        c.get("backlog_id")
        for c in output.get("changes_applied", [])
        if c.get("backlog_id")
    }
    remaining = []
    for item in data.get("backlog", []):
        if item.get("id") in applied_ids:
            item["status"] = "completed"
            item["completed_date"] = today
            data.setdefault("completed", []).append(item)
        else:
            remaining.append(item)
    data["backlog"] = remaining

    # Add new backlog items
    existing_ids = {item.get("id") for item in data["backlog"]}
    existing_ids.update(item.get("id") for item in data.get("completed", []))
    max_id = 0
    for item in data["backlog"] + data.get("completed", []):
        item_id = item.get("id", "UI-000")
        try:
            num = int(item_id.split("-")[1])
            max_id = max(max_id, num)
        except (IndexError, ValueError):
            pass

    for new_item in output.get("new_backlog_items", []):
        max_id += 1
        new_entry = {
            "id": f"UI-{max_id:03d}",
            "component": new_item.get("component", "unknown"),
            "description": new_item.get("description", ""),
            "priority": new_item.get("priority", "medium"),
            "status": "pending",
            "source": "audit",
            "created": today,
        }
        data["backlog"].append(new_entry)

    # Keep completed list to last 50
    data["completed"] = data.get("completed", [])[-50:]

    _BACKLOG_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  Backlog updated: {len(data['backlog'])} pending, {len(data.get('completed', []))} completed")


# ──────────────────────────────────────────────────────────────────────────────
# Mode: Directive (existing behavior)
# ──────────────────────────────────────────────────────────────────────────────

def _run_directive_mode() -> None:
    """Run UI Designer in directive mode — reads Marketing Director directives."""
    if not _check_should_run_directive():
        print(f"\n{'='*60}")
        print("  UI DESIGNER (Directive): Nothing to do today.")
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

    result = _kickoff_with_retry(crew)
    raw    = result.raw if result.raw else ""

    output = _parse_json_output(raw)
    _print_results(output)
    _write_change_log(output)


# ──────────────────────────────────────────────────────────────────────────────
# Mode: Audit (proactive — always runs)
# ──────────────────────────────────────────────────────────────────────────────

def _start_hugo_server():
    """Start Hugo dev server for visual inspection. Returns process or None."""
    import subprocess
    blog_dir = _REPO_ROOT / "blog"
    try:
        proc = subprocess.Popen(
            ["hugo", "server", "--port", "1314", "--disableLiveReload", "--noHTTPCache"],
            cwd=str(blog_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        # Wait for server ready
        import urllib.request
        for _ in range(20):
            time.sleep(0.5)
            try:
                urllib.request.urlopen("http://localhost:1314/", timeout=2)
                print("  Hugo dev server started on :1314")
                return proc
            except Exception:
                continue
        print("  Hugo server started but readiness check timed out — visual tools may work")
        return proc
    except FileNotFoundError:
        print("  Hugo not found — visual inspection will be skipped")
        return None


def _stop_hugo_server(proc):
    """Gracefully stop Hugo dev server."""
    if proc is None:
        return
    try:
        proc.terminate()
        proc.wait(timeout=5)
        print("  Hugo dev server stopped")
    except Exception:
        proc.kill()


def _run_audit_mode() -> None:
    """Run UI Auditor in proactive mode — always runs, picks from backlog."""
    from crewai import Crew, Process
    from pipeline.agents.ui_designer import build_ui_auditor
    from pipeline.tasks.ui_audit_task import build_ui_audit_task

    # Start Hugo server for visual inspection tools
    hugo_proc = _start_hugo_server()

    try:
        auditor = build_ui_auditor()
        task    = build_ui_audit_task(auditor)

        crew = Crew(
            agents=[auditor],
            tasks=[task],
            process=Process.sequential,
            verbose=True,
        )

        result = _kickoff_with_retry(crew)
        raw    = result.raw if result.raw else ""

        output = _parse_json_output(raw)
        _print_results(output)
        _write_change_log(output)
        _update_backlog(output)
    finally:
        _stop_hugo_server(hugo_proc)


# ──────────────────────────────────────────────────────────────────────────────
# Shared output
# ──────────────────────────────────────────────────────────────────────────────

def _print_results(output: dict) -> None:
    applied = output.get("changes_applied", [])
    skipped = output.get("changes_skipped", [])
    summary = output.get("summary", "")

    print(f"\n{'='*60}")
    print("  PARSING UI OUTPUT")
    print(f"{'='*60}\n")

    print(f"  Changes applied : {len(applied)}")
    print(f"  Changes skipped : {len(skipped)}")
    print(f"  Summary         : {summary}")

    if applied:
        print("\n  Applied changes:")
        for c in applied:
            print(f"    - {c.get('component')} / {c.get('property')}: "
                  f"{c.get('old_value')} -> {c.get('new_value')}")

    if skipped:
        print("\n  Skipped:")
        for s in skipped:
            bid = s.get("backlog_id", s.get("component", "?"))
            print(f"    - {bid}: {s.get('reason')}")

    new_items = output.get("new_backlog_items", [])
    if new_items:
        print(f"\n  New backlog items discovered: {len(new_items)}")
        for item in new_items:
            print(f"    + {item.get('component')}: {item.get('description')}")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Particle Post UI Designer/Auditor")
    parser.add_argument(
        "--mode",
        choices=["directive", "audit"],
        default="audit",
        help="directive = Marketing Director directives; audit = proactive self-audit (default)"
    )
    args = parser.parse_args()

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    mode_label = "DIRECTIVE" if args.mode == "directive" else "PROACTIVE AUDIT"

    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — UI DESIGNER ({mode_label})")
    print(f"  {today}")
    print(f"{'='*60}\n")

    missing = _check_env()
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)

    if args.mode == "directive":
        _run_directive_mode()
    else:
        _run_audit_mode()

    print(f"\n{'='*60}")
    print(f"  UI DESIGNER ({mode_label}) COMPLETE")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
