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

_CONFIG_DIR       = _REPO_ROOT / "pipeline" / "config"
_LOGS_DIR         = _REPO_ROOT / "pipeline" / "logs" / "marketing"
_STRATEGY_FILE    = _CONFIG_DIR / "marketing_strategy.json"
_SEO_FILE         = _CONFIG_DIR / "seo_guidelines.md"
_EDITORIAL_FILE   = _CONFIG_DIR / "editorial_guidelines.md"
_UI_DIRECTIVES_FILE = _CONFIG_DIR / "ui_directives.json"


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


def _write_daily_report(output: dict) -> None:
    report = output.get("daily_report", "")
    if not report:
        return
    _LOGS_DIR.mkdir(parents=True, exist_ok=True)
    today     = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    log_path  = _LOGS_DIR / f"{today}.md"
    log_path.write_text(report, encoding="utf-8")
    print(f"  Daily report written → {log_path}")


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
    from pipeline.tasks.marketing_analysis_task import build_marketing_analysis_task

    director = build_marketing_director()
    task     = build_marketing_analysis_task(director)

    crew = Crew(
        agents=[director],
        tasks=[task],
        process=Process.sequential,
        verbose=True,
    )

    result = crew.kickoff()
    raw    = result.raw if result.raw else ""

    print(f"\n{'='*60}")
    print("  PARSING MARKETING DIRECTOR OUTPUT")
    print(f"{'='*60}\n")

    output   = _parse_output(raw)
    decision = output.get("decision", "KEEP")
    rationale = output.get("rationale", "")

    print(f"  Decision: {decision}")
    print(f"  Rationale: {rationale}\n")

    # Write all output files
    _update_strategy_file(output)
    _write_seo_guidelines(output)
    _write_editorial_guidelines(output)
    _write_ui_directives(output)
    _write_daily_report(output)

    print(f"\n{'='*60}")
    print("  MARKETING ANALYSIS COMPLETE")
    print(f"  Decision: {decision}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
