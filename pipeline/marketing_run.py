#!/usr/bin/env python3
"""
Particle Post — Marketing Director Daily Analysis

Runs at noon ET via GitHub Actions (cron: 0 16 * * *).
Collects GA4 + GSC + Trends + Tavily data, evaluates strategy,
and updates config files read by the Production Director.

Usage:
    python -m pipeline.marketing_run
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

_CONFIG_DIR            = _REPO_ROOT / "pipeline" / "config"
_LOGS_DIR              = _REPO_ROOT / "pipeline" / "logs" / "marketing"
_STRATEGY_FILE         = _CONFIG_DIR / "marketing_strategy.json"
_SEO_FILE              = _CONFIG_DIR / "seo_guidelines.md"
_EDITORIAL_FILE        = _CONFIG_DIR / "editorial_guidelines.md"
_UI_DIRECTIVES_FILE    = _CONFIG_DIR / "ui_directives.json"
_CONTENT_STRATEGY_FILE = _CONFIG_DIR / "content_strategy.json"
_GSO_CONFIG_FILE       = _CONFIG_DIR / "seo_gso_config.json"


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _check_env() -> list[str]:
    required = ["ANTHROPIC_API_KEY", "TAVILY_API_KEY"]
    return [v for v in required if not os.environ.get(v)]


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[^\n]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.strip())
    return text.strip()


def _extract_section(raw: str, delimiter: str) -> str | None:
    """Extract the content after a ===DELIMITER=== marker until the next === or end of string."""
    pattern = rf"==={re.escape(delimiter)}===\s*\n(.*?)(?====[A-Z_]+=====|\Z)"
    match = re.search(pattern, raw, re.DOTALL)
    return match.group(1).strip() if match else None


def _parse_output(raw: str) -> dict:
    """
    Parse the Marketing Director's structured output.

    Expected format:
      { small JSON block — no embedded markdown }
      ===SEO_GUIDELINES===
      (markdown)
      ===DAILY_REPORT===
      (markdown)
      ===EDITORIAL_GUIDELINES===   ← optional
      (markdown)

    Falls back gracefully if JSON is missing or malformed.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # ── Extract JSON block (everything before the first ===) ──────────────────
    json_part = raw
    first_delim = re.search(r"^===\w+===", raw, re.MULTILINE)
    if first_delim:
        json_part = raw[:first_delim.start()]

    json_part = _strip_code_fences(json_part.strip())

    data: dict = {}

    # Tier 1: direct parse
    try:
        data = json.loads(json_part)
    except (json.JSONDecodeError, ValueError):
        pass

    # Tier 2: outermost braces in json_part
    if not data:
        start = json_part.find("{")
        end   = json_part.rfind("}")
        if start != -1 and end > start:
            try:
                data = json.loads(json_part[start: end + 1])
            except (json.JSONDecodeError, ValueError):
                pass

    # Tier 3: scan full raw for any {...} containing "decision"
    if not data:
        match = re.search(r'\{[^{}]*"decision"[^{}]*\}', raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
            except (json.JSONDecodeError, ValueError):
                pass

    if not data:
        print("\n[WARN] Marketing Director JSON block could not be parsed.")
        print(f"  JSON part (first 500 chars):\n  {json_part[:500]}")
        data = {
            "decision": "KEEP",
            "rationale": "Output parse failed — keeping existing strategy unchanged.",
            "strategy_update": {},
            "update_editorial_guidelines": False,
            "ui_directives": None,
        }

    # ── Extract markdown sections ─────────────────────────────────────────────
    data["seo_guidelines"]       = _extract_section(raw, "SEO_GUIDELINES")
    data["daily_report"]         = _extract_section(raw, "DAILY_REPORT")
    data["editorial_guidelines"] = _extract_section(raw, "EDITORIAL_GUIDELINES")

    if not data["seo_guidelines"]:
        print("  [WARN] ===SEO_GUIDELINES=== section not found in output.")
    if not data["daily_report"]:
        print("  [WARN] ===DAILY_REPORT=== section not found — using fallback.")
        data["daily_report"] = (
            f"# Marketing Analysis {today}\n\n"
            "⚠️ Daily report section missing from agent output."
        )

    return data


def _update_strategy_file(output: dict) -> None:
    """Update marketing_strategy.json with the new decision and strategy."""
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)

    if _STRATEGY_FILE.exists():
        try:
            data = json.loads(_STRATEGY_FILE.read_text(encoding="utf-8"))
        except Exception:
            data = {"current_plan": {}, "metrics_baseline": {}, "decision_history": []}
    else:
        data = {"current_plan": {}, "metrics_baseline": {}, "decision_history": []}

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    decision      = output.get("decision", "KEEP")
    rationale     = output.get("rationale", "")
    strategy_upd  = output.get("strategy_update", {})

    # Archive the current plan in decision_history
    if data.get("current_plan"):
        data.setdefault("decision_history", []).append({
            "date":     today,
            "decision": decision,
            "rationale": rationale,
            "plan_summary": data["current_plan"].get("description", ""),
        })
        # Keep last 30 entries
        data["decision_history"] = data["decision_history"][-30:]

    # Update current plan
    if strategy_upd:
        data["current_plan"] = {
            "type":                 decision,
            "started":              today,
            "description":          strategy_upd.get("description", ""),
            "content_pillar_focus": strategy_upd.get("content_pillar_focus", ""),
            "target_keywords":      strategy_upd.get("target_keywords", []),
            "long_tail_keywords":   strategy_upd.get("long_tail_keywords", []),
            "evaluation_date":      strategy_upd.get("evaluation_date", ""),
            "rationale":            rationale,
        }

    _STRATEGY_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  Strategy updated → {decision}")


def _write_seo_guidelines(output: dict) -> None:
    seo_content = output.get("seo_guidelines")
    if not seo_content:
        print("  SEO guidelines: no content in output — keeping existing file.")
        return
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    _SEO_FILE.write_text(seo_content, encoding="utf-8")
    print(f"  SEO guidelines written ({len(seo_content)} chars)")


def _write_editorial_guidelines(output: dict) -> None:
    if not output.get("update_editorial_guidelines"):
        return
    content = output.get("editorial_guidelines")
    if not content:
        print("  Editorial guidelines: update_editorial_guidelines=true but no content — skipping.")
        return
    _EDITORIAL_FILE.write_text(content, encoding="utf-8")
    print(f"  Editorial guidelines updated ({len(content)} chars)")


def _write_ui_directives(output: dict) -> None:
    """Write ui_directives.json if the Marketing Director issued new UI directives."""
    directives = output.get("ui_directives")
    if not directives or not directives.get("directives"):
        print("  UI directives: none issued today.")
        return
    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    directives["generated_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    _UI_DIRECTIVES_FILE.write_text(
        json.dumps(directives, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    count = len(directives["directives"])
    print(f"  UI directives written ({count} directive(s) for UI Designer)")


def _write_gso_directives(raw: str) -> None:
    """
    Extract ===GSO_DIRECTIVES=== section from the SEO/GSO noon task output
    and merge into seo_gso_config.json.
    """
    # Handle both marker styles
    pattern = r"===GSO_DIRECTIVES===\s*\n(.*?)(?:===END_GSO_DIRECTIVES===|\Z)"
    match   = re.search(pattern, raw, re.DOTALL)
    if not match:
        print("  GSO directives: none found in SEO noon task output.")
        return

    section = match.group(1).strip()
    try:
        directives = json.loads(section)
    except json.JSONDecodeError:
        print(f"  [WARN] GSO directives JSON malformed — skipping. First 200 chars: {section[:200]}")
        return

    _CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    if _GSO_CONFIG_FILE.exists():
        try:
            config = json.loads(_GSO_CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            config = {}
    else:
        config = {}

    # Merge directives (preserve schema_coverage and gso_article_log)
    for key, val in directives.items():
        if key == "ai_citation_audit" and val is not None:
            config["ai_citation_audit"] = val
        elif key not in ("schema_coverage", "gso_article_log"):
            config[key] = val

    config["last_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    _GSO_CONFIG_FILE.write_text(
        json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    kw_count = len(directives.get("keyword_targets", []))
    print(f"  GSO directives written ({kw_count} keyword targets).")

    # Sync content gap priorities into research memory
    gaps = config.get("content_gap_priorities", [])
    if gaps:
        try:
            from pipeline.utils.research_memory import sync_content_gaps
            sync_content_gaps(gaps)
            print(f"  Research memory: synced {len(gaps)} content gaps")
        except Exception as mem_err:
            print(f"  [Research Memory] Warning: {mem_err}")


def _write_daily_report(output: dict) -> None:
    report = output.get("daily_report", "")
    if not report:
        return
    _LOGS_DIR.mkdir(parents=True, exist_ok=True)
    today     = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log_path  = _LOGS_DIR / f"{today}.md"
    log_path.write_text(report, encoding="utf-8")
    print(f"  Daily report written → {log_path}")


def _apply_content_strategy_changes(output: dict) -> None:
    """Apply Marketing Director's proposed changes to content_strategy.json.

    Changes are applied one at a time using dot-notation field paths.
    Protected fields are never modified. Changes are logged to change_log.
    """
    changes = output.get("strategy_changes", [])
    if not changes:
        print("  Content strategy: no changes proposed.")
        return

    if not _CONTENT_STRATEGY_FILE.exists():
        print("  [WARN] content_strategy.json not found — skipping strategy changes.")
        return

    try:
        strategy = json.loads(_CONTENT_STRATEGY_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  [WARN] Could not read content_strategy.json: {e}")
        return

    # Protected fields that can never be changed via Marketing Director
    protected = {
        "funnel_types.TOF.mandatory_sections",
        "funnel_types.MOF.mandatory_sections",
        "funnel_types.BOF.mandatory_sections",
        "internal_linking_strategy.goal",
        "ai_tells_to_avoid",
        "evolution_rules",
    }

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    applied = 0

    for change in changes[:2]:  # max 2 changes
        field_path = change.get("field_path", "")
        new_value  = change.get("new_value")
        rationale  = change.get("rationale", "")

        if not field_path or new_value is None:
            print(f"  [WARN] Skipping invalid change (missing field_path or new_value): {change}")
            continue

        if any(field_path.startswith(p) for p in protected):
            print(f"  [WARN] Skipping protected field: {field_path}")
            continue

        # Navigate the dot-notation path and apply the change
        keys = field_path.split(".")
        node = strategy
        try:
            for key in keys[:-1]:
                node = node[key]
            old_value = node.get(keys[-1])
            node[keys[-1]] = new_value
            print(f"  Strategy change applied: {field_path}: {old_value!r} → {new_value!r}")
            print(f"    Rationale: {rationale}")

            # Log the change
            strategy.setdefault("change_log", []).append({
                "date": today,
                "field_path": field_path,
                "old_value": old_value,
                "new_value": new_value,
                "rationale": rationale,
                "metric_to_watch": change.get("metric_to_watch", ""),
                "rollback_trigger": change.get("rollback_trigger", ""),
            })
            # Keep last 50 changes in log
            strategy["change_log"] = strategy["change_log"][-50:]
            applied += 1
        except (KeyError, TypeError) as e:
            print(f"  [WARN] Could not apply change to {field_path}: {e}")

    if applied > 0:
        strategy["last_updated"] = today
        strategy["version"] = strategy.get("version", "2.1.0")
        _CONTENT_STRATEGY_FILE.write_text(
            json.dumps(strategy, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"  Content strategy updated ({applied} change(s) applied) → {_CONTENT_STRATEGY_FILE.name}")
    else:
        print("  Content strategy: no valid changes applied.")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    missing = _check_env()
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — MARKETING DIRECTOR ANALYSIS")
    print(f"  {today}")
    print(f"{'='*60}\n")

    from crewai import Crew, Process
    from pipeline.agents.marketing_director import build_marketing_director
    from pipeline.agents.seo_gso_specialist import build_seo_gso_specialist
    from pipeline.tasks.marketing_analysis_task import build_marketing_analysis_task
    from pipeline.tasks.seo_noon_task import build_seo_noon_task

    director       = build_marketing_director()
    seo_specialist = build_seo_gso_specialist()

    marketing_task = build_marketing_analysis_task(director)
    seo_task       = build_seo_noon_task(seo_specialist, marketing_task)

    crew = Crew(
        agents=[director, seo_specialist],
        tasks=[marketing_task, seo_task],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff()

    # Log API cost
    try:
        from pipeline.utils.cost_logger import save_cost_log
        save_cost_log(result.token_usage, "marketing", 1, "N/A")
    except Exception as cost_err:
        print(f"  [Cost Logger] Warning: {cost_err}")

    # Marketing Director output is the first task
    md_raw  = result.tasks_output[0].raw if result.tasks_output else ""
    # SEO noon task output is the second task
    seo_raw = result.tasks_output[1].raw if len(result.tasks_output) > 1 else ""

    print(f"\n{'='*60}")
    print("  PARSING MARKETING DIRECTOR OUTPUT")
    print(f"{'='*60}\n")

    output    = _parse_output(md_raw)
    decision  = output.get("decision", "KEEP")
    rationale = output.get("rationale", "")

    print(f"  Decision: {decision}")
    print(f"  Rationale: {rationale}\n")

    # Write all output files
    _update_strategy_file(output)
    _write_seo_guidelines(output)
    _write_editorial_guidelines(output)
    _write_ui_directives(output)
    _apply_content_strategy_changes(output)
    _write_daily_report(output)

    # Write SEO/GSO directives from the noon collaboration task
    print(f"\n{'='*60}")
    print("  PARSING SEO/GSO SPECIALIST OUTPUT")
    print(f"{'='*60}\n")
    _write_gso_directives(seo_raw)

    print(f"\n{'='*60}")
    print("  MARKETING ANALYSIS COMPLETE")
    print(f"  Decision: {decision}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
