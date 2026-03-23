#!/usr/bin/env python3
"""
Particle Post Pipeline Entry Point

Usage:
    python -m pipeline.run --slot morning
    python -m pipeline.run --slot evening
    python -m pipeline.run --slot morning --dry-run   # skips file write, prints result
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Fix Windows console encoding for CrewAI emoji output
if sys.platform == "win32":
    os.environ.setdefault("PYTHONIOENCODING", "utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Load .env from repo root
_REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_REPO_ROOT / ".env", override=True)

POSTS_DIR      = _REPO_ROOT / "blog" / "content" / "posts"
HISTORY_FILE   = _REPO_ROOT / "blog" / "data" / "topics_history.json"
REJECTIONS_DIR = _REPO_ROOT / "pipeline" / "logs" / "rejections"
FEEDBACK_FILE  = _REPO_ROOT / "pipeline" / "data" / "writer_feedback.json"

MAX_ATTEMPTS = 2


# ──────────────────────────────────────────────────────────────────────────────
# Environment helpers
# ──────────────────────────────────────────────────────────────────────────────

def _check_env() -> list[str]:
    required = ["ANTHROPIC_API_KEY", "TAVILY_API_KEY"]
    return [var for var in required if not os.environ.get(var)]


# ──────────────────────────────────────────────────────────────────────────────
# Frontmatter parsing
# ──────────────────────────────────────────────────────────────────────────────

def _extract_frontmatter_field(content: str, field: str) -> str:
    """Extract a scalar field value from YAML frontmatter."""
    pattern = rf'^{field}:\s*["\']?([^"\'\n]+)["\']?'
    match = re.search(pattern, content, re.MULTILINE)
    return match.group(1).strip() if match else ""


def _extract_frontmatter_list(content: str, field: str) -> list[str]:
    """Extract a list field from YAML frontmatter (- item style)."""
    pattern = rf'^{field}:\s*\n((?:[ \t]+-[^\n]+\n?)+)'
    match = re.search(pattern, content, re.MULTILINE)
    if not match:
        return []
    items = re.findall(r'-\s*["\']?([^"\'\n]+)["\']?', match.group(1))
    return [i.strip() for i in items]


# ──────────────────────────────────────────────────────────────────────────────
# Content cleaning
# ──────────────────────────────────────────────────────────────────────────────

def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences the LLM may have wrapped output in."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[^\n]*\n?", "", text)
        text = re.sub(r"\n?```$", "", text.strip())
    return text.strip()


# ──────────────────────────────────────────────────────────────────────────────
# Production Director verdict parsing
# ──────────────────────────────────────────────────────────────────────────────

def _parse_director_verdict(raw: str) -> dict:
    """
    Parse the Production Director's JSON verdict robustly.

    Three-tier extraction:
      1. Strip fences and direct json.loads()
      2. Regex-extract first {...} block containing "decision"
      3. Find outermost { } and attempt parse

    On complete failure, returns a safe REJECT sentinel so we never
    silently publish an article whose quality was not verified.
    """
    cleaned = _strip_code_fences(raw)

    # Tier 1: direct parse
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        pass

    # Tier 2: extract first {...} containing "decision"
    match = re.search(r'\{[^{}]*"decision"[^{}]*\}', cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except (json.JSONDecodeError, ValueError):
            pass

    # Tier 3: outermost braces
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start: end + 1])
        except (json.JSONDecodeError, ValueError):
            pass

    # All tiers failed — log and return safe REJECT
    print("\n[WARN] Production Director output could not be parsed as JSON.")
    print(f"  Raw output (first 500 chars):\n  {raw[:500]}")
    return {
        "decision": "REJECT",
        "score": 0,
        "issues": ["Director output was not valid JSON — article quality cannot be verified."],
        "coaching_notes": [],
    }


# ──────────────────────────────────────────────────────────────────────────────
# Coaching notes persistence
# ──────────────────────────────────────────────────────────────────────────────

def _save_coaching_notes(verdict: dict, slot: str) -> None:
    """
    Persist the Production Director's coaching notes to writer_feedback.json.

    Called after every pipeline run (approved or rejected) so the writer
    reads accumulated feedback on the next article.
    Keeps the last 30 notes.
    """
    notes = verdict.get("coaching_notes", [])
    if not notes:
        return

    FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
    if FEEDBACK_FILE.exists():
        try:
            data = json.loads(FEEDBACK_FILE.read_text(encoding="utf-8"))
        except Exception:
            data = {"notes": []}
    else:
        data = {"notes": []}

    ts = datetime.now(timezone.utc).isoformat()
    for note in notes:
        data["notes"].append({"text": note, "slot": slot, "date": ts})

    data["notes"] = data["notes"][-30:]  # keep last 30
    FEEDBACK_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  Coaching notes saved ({len(data['notes'])} total in log).")


# ──────────────────────────────────────────────────────────────────────────────
# Rejection log
# ──────────────────────────────────────────────────────────────────────────────

def _write_rejection_log(
    slot: str, attempt: int, verdict: dict, article_preview: str
) -> Path:
    """Write a structured rejection log to pipeline/logs/rejections/."""
    REJECTIONS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d-%H-%M")
    log_path = REJECTIONS_DIR / f"{timestamp}.json"
    log = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "slot": slot,
        "attempt": attempt,
        "verdict": verdict,
        "article_preview": article_preview[:800],
    }
    log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  Rejection log written to: {log_path}")
    return log_path


# ──────────────────────────────────────────────────────────────────────────────
# Post writing
# ──────────────────────────────────────────────────────────────────────────────

def _submit_to_search_engines(url: str) -> None:
    """
    Submit a newly published article URL to Google and Bing/Edge/Yandex.
    Non-fatal — logs warnings on failure but never raises.
    """
    print(f"\n  Submitting to search engines: {url}")
    for label, module_path, class_name in [
        ("Google Indexing API", "pipeline.tools.google_indexing", "GoogleIndexingTool"),
        ("IndexNow (Bing/Edge/Yandex)", "pipeline.tools.indexnow", "IndexNowTool"),
    ]:
        try:
            import importlib
            mod  = importlib.import_module(module_path)
            tool = getattr(mod, class_name)()
            result = tool._run(url)
            print(f"  [{label}] {result}")
        except Exception as exc:
            print(f"  [WARN] {label} submission failed: {exc}")


def _write_post(content: str, dry_run: bool) -> None:
    """Extract metadata from frontmatter and write the post to disk."""
    slug  = _extract_frontmatter_field(content, "slug")
    title = _extract_frontmatter_field(content, "title")
    tags  = _extract_frontmatter_list(content, "tags")

    if not slug:
        slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") if title else "post"

    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename  = f"{date_str}-{slug}.md"
    post_path = POSTS_DIR / filename

    if dry_run:
        print(f"\n[DRY RUN] Would write: {post_path}")
        print(f"  Title : {title}")
        print(f"  Slug  : {slug}")
        print(f"  Tags  : {tags}")
        print(f"\nContent preview (first 400 chars):\n{content[:400]}\n")
        return

    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    post_path.write_text(content, encoding="utf-8")
    print(f"\nPost written to: {post_path}")

    _update_history(title=title, slug=slug, tags=tags, filename=filename)

    # Submit to search engines for immediate indexing
    article_url = f"https://theparticlepost.com/posts/{slug}/"
    _submit_to_search_engines(article_url)


def _update_history(title: str, slug: str, tags: list, filename: str) -> None:
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    if HISTORY_FILE.exists():
        try:
            history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            history = {"posts": []}
    else:
        history = {"posts": []}

    history["posts"].append({
        "title": title,
        "slug": slug,
        "tags": tags,
        "filename": filename,
        "published_at": datetime.now(timezone.utc).isoformat(),
    })
    history["posts"] = history["posts"][-60:]
    HISTORY_FILE.write_text(
        json.dumps(history, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"History updated ({len(history['posts'])} entries).")


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Particle Post publishing pipeline.")
    parser.add_argument("--slot", choices=["morning", "evening"], required=True)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the full pipeline but skip writing the file to disk.",
    )
    args = parser.parse_args()

    missing = _check_env()
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — {args.slot.upper()} PIPELINE")
    print(f"{'='*60}\n")

    from pipeline.crew import build_crew

    rejection_feedback = ""
    last_verdict: dict = {}
    formatter_content = ""

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"\n─── Pipeline attempt {attempt} of {MAX_ATTEMPTS} ───\n")

        crew = build_crew(slot=args.slot)
        result = crew.kickoff(inputs={"rejection_feedback": rejection_feedback})

        # Formatter output = second-to-last task (index -2)
        if result.tasks_output and len(result.tasks_output) >= 2:
            formatter_raw = result.tasks_output[-2].raw or ""
        else:
            formatter_raw = ""
        formatter_content = _strip_code_fences(formatter_raw)

        # Production Director verdict = last task (index -1)
        director_raw = result.tasks_output[-1].raw if result.tasks_output else ""
        verdict = _parse_director_verdict(director_raw or "")
        last_verdict = verdict

        decision = verdict.get("decision", "REJECT").upper()
        score    = verdict.get("score", 0)
        issues   = verdict.get("issues", [])
        coaching = verdict.get("coaching_notes", [])

        print(f"\n{'='*60}")
        print(f"  PRODUCTION DIRECTOR: {decision}  (score {score}/100)")
        if issues:
            print("  Issues:")
            for issue in issues:
                print(f"    - {issue}")
        if coaching:
            print("  Coaching notes:")
            for note in coaching:
                print(f"    > {note}")
        print(f"{'='*60}\n")

        # Always persist coaching notes (approved or rejected)
        _save_coaching_notes(verdict, args.slot)

        if decision == "APPROVE":
            _write_post(content=formatter_content, dry_run=args.dry_run)
            return  # success

        # REJECT path
        if attempt < MAX_ATTEMPTS:
            print(f"  Article rejected. Retrying with feedback injected...\n")
            rejection_feedback = (
                f"PREVIOUS ATTEMPT REJECTED by the Production Director. "
                f"Score: {score}/100.\n"
                "Fix ALL of the following issues before submitting again:\n"
                + "\n".join(f"  - {i}" for i in issues)
            )
        # else: loop ends naturally, fall through to failure handling

    # Both attempts exhausted
    print(f"\n{'='*60}")
    print(f"  PIPELINE FAILED — Article rejected after {MAX_ATTEMPTS} attempts")
    print(f"  Final score: {last_verdict.get('score', 0)}/100")
    print(f"{'='*60}\n")

    log_path = _write_rejection_log(
        slot=args.slot,
        attempt=MAX_ATTEMPTS,
        verdict=last_verdict,
        article_preview=formatter_content,
    )

    raise RuntimeError(
        f"Production Director rejected article after {MAX_ATTEMPTS} attempts. "
        f"Score: {last_verdict.get('score', 0)}/100. "
        f"Issues: {last_verdict.get('issues', [])}. "
        f"See rejection log: {log_path}"
    )


if __name__ == "__main__":
    main()
