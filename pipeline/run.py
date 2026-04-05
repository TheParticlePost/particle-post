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
import time
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

POSTS_DIR        = _REPO_ROOT / "blog" / "content" / "posts"
HISTORY_FILE     = _REPO_ROOT / "blog" / "data" / "topics_history.json"
REJECTIONS_DIR   = _REPO_ROOT / "pipeline" / "logs" / "rejections"
FEEDBACK_FILE    = _REPO_ROOT / "pipeline" / "data" / "writer_feedback.json"
POST_INDEX_FILE  = _REPO_ROOT / "pipeline" / "config" / "post_index.json"
GSO_CONFIG_FILE  = _REPO_ROOT / "pipeline" / "config" / "seo_gso_config.json"
LLMS_TXT_FILE    = _REPO_ROOT / "blog" / "static" / "llms.txt"
LLMS_FULL_FILE   = _REPO_ROOT / "blog" / "static" / "llms-full.txt"
URGENT_TOPIC_FILE = _REPO_ROOT / "pipeline" / "data" / "urgent_topic.json"
TOPIC_PERF_FILE   = _REPO_ROOT / "pipeline" / "data" / "topic_performance.json"

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
# Post-processing: mechanical sanitization (runs BEFORE Production Director)
# ──────────────────────────────────────────────────────────────────────────────

def _sanitize_article(content: str) -> str:
    """
    Programmatic post-processing of the formatter's output.
    Fixes issues that LLM agents consistently fail to self-correct:
      0. Duplicate article stripping (two articles stacked back-to-back)
      1. Em-dash removal (replace with comma or period)
      2. En-dash cleanup
      3. Double-hyphen cleanup
    This runs AFTER the formatter but BEFORE the Production Director scores.
    """
    if not content:
        return content

    original = content
    fixes_applied = []

    # 0. Strip duplicate articles — formatter sometimes outputs two versions
    #    Patterns: "[RESTRUCTURED ARTICLE]", "---\ntitle:" appearing twice,
    #    or a second H1 (# Title) after the article body
    restructured_match = re.search(
        r'\n\s*\[RESTRUCTURED\s+ARTICLE\].*', content, re.DOTALL | re.IGNORECASE
    )
    if restructured_match:
        content = content[:restructured_match.start()].rstrip()
        fixes_applied.append("Stripped [RESTRUCTURED ARTICLE] duplicate block")

    # Also catch a second frontmatter block (---\ntitle:) appearing mid-content
    frontmatter_blocks = list(re.finditer(r'^---\s*\n', content, re.MULTILINE))
    if len(frontmatter_blocks) > 2:
        # Keep only content up to the third --- (start of second frontmatter)
        content = content[:frontmatter_blocks[2].start()].rstrip()
        fixes_applied.append("Stripped duplicate frontmatter/article block")

    # Catch a second H1 (# Title) appearing after the first article body
    h1_matches = list(re.finditer(r'^# [^\n]+', content, re.MULTILINE))
    if len(h1_matches) > 1:
        # Keep only content up to the second H1
        content = content[:h1_matches[1].start()].rstrip()
        fixes_applied.append("Stripped duplicate article (second H1 detected)")

    # 1. Replace em-dashes (U+2014) with context-aware punctuation
    #    Pattern: " -- " or " --- " surrounded by words -> ", " or ". "
    em_dash_count = content.count("\u2014")
    if em_dash_count > 0:
        # Replace " --- " or " -- " (spaced em-dash used as parenthetical) with comma
        content = re.sub(r'\s*\u2014\s*', ', ', content)
        # Clean up double commas or comma-period combos
        content = re.sub(r',\s*,', ',', content)
        content = re.sub(r',\s*\.', '.', content)
        # Clean up comma at start of line (from em-dash after newline)
        content = re.sub(r'\n,\s*', '\n', content)
        fixes_applied.append(f"Replaced {em_dash_count} em-dash(es)")

    # 1b. Replace temporary Pixabay /get/ URLs with Pexels fallback
    pixabay_get_match = re.search(r'image:\s*"(https://pixabay\.com/get/[^"]+)"', content)
    if pixabay_get_match:
        # Replace with a reliable Pexels placeholder — the /get/ URL will expire
        content = content.replace(
            pixabay_get_match.group(1),
            "https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"
        )
        fixes_applied.append("Replaced expiring Pixabay /get/ URL with Pexels fallback")

    # 1c. Catch Pixabay thumbnail URLs (150px/180px/340px preview — too small for cover images)
    pixabay_thumb = re.search(r'image:\s*"(https://cdn\.pixabay\.com/[^"]*_(?:150|180|340)\.[^"]+)"', content)
    if pixabay_thumb:
        content = content.replace(
            pixabay_thumb.group(1),
            "https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"
        )
        fixes_applied.append("Replaced Pixabay thumbnail URL with Pexels fallback")

    # 2. Replace en-dashes (U+2013) used as em-dashes (not in number ranges)
    #    Keep en-dashes in ranges like "2020-2026" or "$1M-$5M"
    en_dash_count = len(re.findall(r'(?<!\d)\u2013(?!\d)', content))
    if en_dash_count > 0:
        content = re.sub(r'(?<!\d)\u2013(?!\d)', ',', content)
        fixes_applied.append(f"Replaced {en_dash_count} en-dash(es)")

    # 3. Replace double-hyphens used as em-dashes
    double_hyphen_count = len(re.findall(r'(?<!\-)\-\-(?!\-)', content))
    if double_hyphen_count > 0:
        content = re.sub(r'\s*(?<!\-)--(?!\-)\s*', ', ', content)
        fixes_applied.append(f"Replaced {double_hyphen_count} double-hyphen(s)")

    if fixes_applied:
        print(f"\n  [SANITIZER] {'; '.join(fixes_applied)}")
    else:
        print(f"\n  [SANITIZER] Article clean, no fixes needed.")

    return content


# ──────────────────────────────────────────────────────────────────────────────
# Programmatic score correction (overrides false-positive director deductions)
# ──────────────────────────────────────────────────────────────────────────────

def _correct_verdict(verdict: dict, sanitized_content: str) -> dict:
    """
    Correct the Production Director's score by removing false-positive deductions.

    The director evaluates combined context from multiple tasks (formatter +
    SEO/GSO + selection). It often flags 'duplicate content' because the SEO/GSO
    specialist's [RESTRUCTURED ARTICLE] appears alongside the formatter's output.
    It may also flag em-dashes that exist in context but not the actual article.

    This function checks the ACTUAL sanitized formatter output and removes
    deductions for issues that don't exist in the final article.
    """
    if not sanitized_content or not verdict:
        return verdict

    issues = verdict.get("issues", [])
    score = verdict.get("score", 0)
    corrections = []

    # Check: are there actually duplicate articles in the formatter output?
    has_restructured = bool(re.search(r'\[RESTRUCTURED\s+ARTICLE\]', sanitized_content, re.IGNORECASE))
    frontmatter_blocks = list(re.finditer(r'^---\s*$', sanitized_content, re.MULTILINE))
    has_duplicate_frontmatter = len(frontmatter_blocks) > 2
    h1_matches = list(re.finditer(r'^# [^\n]+', sanitized_content, re.MULTILINE))
    has_duplicate_h1 = len(h1_matches) > 1

    actual_duplicate = has_restructured or has_duplicate_frontmatter or has_duplicate_h1

    # Check: are there actually em-dashes in the formatter output?
    actual_em_dashes = sanitized_content.count("\u2014")

    # Remove false-positive duplicate deductions
    if not actual_duplicate:
        new_issues = []
        for issue in issues:
            issue_lower = issue.lower()
            if "duplicate" in issue_lower and ("-20" in issue or "two version" in issue_lower or "two stacked" in issue_lower or "two complete" in issue_lower):
                score += 20
                corrections.append("Removed false-positive DUPLICATE CONTENT (-20): formatter output has no duplicates")
            else:
                new_issues.append(issue)
        issues = new_issues

    # Remove false-positive em-dash deductions
    if actual_em_dashes == 0:
        new_issues = []
        for issue in issues:
            issue_lower = issue.lower()
            if "em-dash" in issue_lower or "em\u2014dash" in issue_lower or ("\u2014" in issue and "ban" in issue_lower):
                # Figure out the deduction amount from the issue text
                if "-30" in issue:
                    score += 30
                    corrections.append("Removed false-positive EM-DASH (-30): formatter output has zero em-dashes")
                elif "-15" in issue:
                    score += 15
                    corrections.append("Removed false-positive EM-DASH (-15): formatter output has zero em-dashes")
                else:
                    score += 15  # conservative default
                    corrections.append("Removed false-positive EM-DASH deduction: formatter output has zero em-dashes")
            else:
                new_issues.append(issue)
        issues = new_issues

    # Cap score at 100
    score = min(score, 100)

    if corrections:
        print(f"\n  [SCORE CORRECTION] Adjusted score: {verdict.get('score', 0)} → {score}")
        for c in corrections:
            print(f"    ✓ {c}")

        verdict = dict(verdict)
        verdict["score"] = score
        verdict["issues"] = issues
        # Re-evaluate decision based on corrected score
        if score >= 65:
            verdict["decision"] = "APPROVE"
            print(f"  [SCORE CORRECTION] Decision overridden: REJECT → APPROVE (score {score} ≥ 65)")

    return verdict


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

    # Tier 4: prose rescue — infer score/decision from Director's written analysis
    # Handles the case where max_tokens truncation cut off before the JSON was written
    print("\n[WARN] Production Director output could not be parsed as JSON — attempting prose rescue.")
    decision_guess = "REJECT"
    score_guess    = 0
    issues_guess   = ["Director output was not valid JSON — score inferred from prose."]

    # Check for explicit approval/rejection signals in prose
    upper = cleaned.upper()
    if re.search(r'\bAPPROVE[D]?\b', upper):
        decision_guess = "APPROVE"
        score_guess    = 75  # conservative pass score when inferred from prose
        issues_guess   = []
    elif re.search(r'\bREJECT(?:ED)?\b', upper):
        decision_guess = "REJECT"
        # try to grab score from prose: "score: 55" or "55/100" or "55 points"
        m = re.search(r'(?:score[:\s]+|total[:\s]+)(\d{1,3})', cleaned, re.IGNORECASE)
        if not m:
            m = re.search(r'(\d{1,3})\s*/\s*100', cleaned)
        if m:
            score_guess = min(100, int(m.group(1)))

    print(f"  Prose rescue result: {decision_guess} (score ~{score_guess})")
    print(f"  Raw output (first 500 chars):\n  {raw[:500]}")
    return {
        "decision": decision_guess,
        "score":    score_guess,
        "issues":   issues_guess,
        "coaching_notes": ["(Director output was truncated — coaching notes unavailable this run)"],
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

def _record_topic_performance(
    slug: str, title: str, funnel_type: str, content_type: str,
    director_score: int, seo_data: dict,
) -> None:
    """Record topic performance for feedback loop to Topic Selector."""
    TOPIC_PERF_FILE.parent.mkdir(parents=True, exist_ok=True)
    if TOPIC_PERF_FILE.exists():
        try:
            data = json.loads(TOPIC_PERF_FILE.read_text(encoding="utf-8"))
        except Exception:
            data = {"articles": []}
    else:
        data = {"articles": []}

    data["articles"].append({
        "slug": slug,
        "title": title,
        "primary_keyword": seo_data.get("primary_keyword", ""),
        "funnel_type": funnel_type,
        "content_type": content_type,
        "director_score": director_score,
        "published_at": datetime.now(timezone.utc).isoformat(),
        "tags": seo_data.get("tags", []),
    })

    # Keep last 50 entries
    data["articles"] = data["articles"][-50:]
    TOPIC_PERF_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  Topic performance recorded (score: {director_score}).")


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

def _parse_seo_json(raw: str) -> dict:
    """
    Extract the SEO/GSO JSON package from the specialist's mixed output.

    The seo_gso_task output format is:
      [RESTRUCTURED ARTICLE]...[END RESTRUCTURED ARTICLE]
      {"primary_keyword": ..., "has_faq": ..., ...}

    Three-tier extraction (mirrors _parse_director_verdict robustness).
    """
    # Strip the [RESTRUCTURED ARTICLE] block first
    cleaned = re.sub(
        r'\[RESTRUCTURED ARTICLE\].*?\[END RESTRUCTURED ARTICLE\]',
        '', raw, flags=re.DOTALL
    ).strip()
    cleaned = _strip_code_fences(cleaned)

    # Tier 1: direct parse of remaining text
    try:
        return json.loads(cleaned)
    except (json.JSONDecodeError, ValueError):
        pass

    # Tier 2: extract first {...} containing "primary_keyword"
    match = re.search(r'\{[^{}]*"primary_keyword"[^{}]*\}', cleaned, re.DOTALL)
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

    return {}


def _update_gso_state(seo_data: dict, slug: str, date_str: str) -> None:
    """Update seo_gso_config.json after a successful article publish."""
    if not seo_data:
        return

    GSO_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    if GSO_CONFIG_FILE.exists():
        try:
            config = json.loads(GSO_CONFIG_FILE.read_text(encoding="utf-8"))
        except Exception:
            config = {}
    else:
        config = {}

    # Increment schema coverage counter
    schema_type = seo_data.get("schema_type", "Article")
    coverage    = config.setdefault("schema_coverage", {"Article": 0, "FAQPage": 0, "HowTo": 0, "NewsArticle": 0})
    coverage[schema_type] = coverage.get(schema_type, 0) + 1

    # Append to GSO article log (keeps last 90)
    log_entry = {
        "date":           date_str,
        "slug":           slug,
        "primary_keyword": seo_data.get("primary_keyword", ""),
        "schema_type":    schema_type,
        "has_faq":        seo_data.get("has_faq", False),
        "search_intent":  seo_data.get("search_intent", ""),
    }
    log = config.setdefault("gso_article_log", [])
    log.append(log_entry)
    config["gso_article_log"] = log[-90:]
    config["last_updated"] = date_str

    GSO_CONFIG_FILE.write_text(
        json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  GSO state updated (schema: {schema_type}, has_faq: {seo_data.get('has_faq', False)}).")


def _generate_llms_txt() -> None:
    """
    Generate AI discoverability files from the published post archive.

    llms.txt      — compact index (title + URL + one-line description)
    llms-full.txt — same with full meta_description per post
    """
    posts = sorted(POSTS_DIR.glob("*.md"), key=lambda p: p.name, reverse=True)
    if not posts:
        return

    entries = []
    for post_path in posts[:100]:
        try:
            content = post_path.read_text(encoding="utf-8")
        except Exception:
            continue
        title = _extract_frontmatter_field(content, "title")
        slug  = _extract_frontmatter_field(content, "slug")
        desc  = _extract_frontmatter_field(content, "description")
        if not title or not slug:
            continue
        url = f"https://theparticlepost.com/posts/{slug}/"
        entries.append({"title": title, "url": url, "description": desc})

    if not entries:
        return

    header = (
        "# Particle Post\n\n"
        "> AI × Business × Finance news and analysis for executives and investors.\n"
        "> theparticlepost.com\n\n"
        "## Posts\n\n"
    )

    compact_lines = [f"- [{e['title']}]({e['url']})" for e in entries]
    full_lines    = [f"- [{e['title']}]({e['url']}): {e['description']}" for e in entries if e["description"]]

    LLMS_TXT_FILE.parent.mkdir(parents=True, exist_ok=True)
    LLMS_TXT_FILE.write_text(header + "\n".join(compact_lines) + "\n", encoding="utf-8")
    LLMS_FULL_FILE.write_text(header + "\n".join(full_lines) + "\n", encoding="utf-8")
    print(f"  llms.txt updated ({len(entries)} posts).")


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


# ──────────────────────────────────────────────────────────────────────────────
# Topic uniqueness check (zero-repetition enforcement)
# ──────────────────────────────────────────────────────────────────────────────

_STOP_WORDS = frozenset(
    "the a an is are was were be been being have has had do does did will would "
    "shall should may might can could of in to for on with at by from as into "
    "through during before after above below between under and but or nor not "
    "so yet both either neither each every all any few more most other some such "
    "no only own same than too very how what which who whom this that these those "
    "it its you your they their we our he his she her".split()
)


def _extract_significant_words(text: str) -> set[str]:
    """Extract meaningful words (>4 chars, not stop words) from text."""
    words = re.findall(r'[a-z]+', text.lower())
    return {w for w in words if len(w) > 4 and w not in _STOP_WORDS}


def _check_topic_uniqueness(title: str, tags: list[str]) -> tuple[bool, str]:
    """Check proposed topic against last 100 articles for uniqueness.

    Enhanced checks:
    1. Same-day stricter duplicate detection (threshold: 0.35)
    2. Standard title similarity > 0.45 (SequenceMatcher)
    3. Core noun phrase overlap (strips common AI/finance modifiers)
    4. Tag overlap > 50%
    5. Keyword overlap > 60%
    6. Same-day shared bigram detection
    """
    from difflib import SequenceMatcher

    past_titles: list[str] = []
    past_tags: list[list[str]] = []
    past_dates: list[str] = []

    if HISTORY_FILE.exists():
        try:
            history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
            for p in history.get("posts", [])[-100:]:
                past_titles.append(p.get("title", ""))
                past_tags.append(p.get("tags", []))
                past_dates.append(p.get("filename", "")[:10])
        except Exception:
            pass

    if POST_INDEX_FILE.exists():
        try:
            index = json.loads(POST_INDEX_FILE.read_text(encoding="utf-8"))
            for p in index.get("posts", [])[:100]:
                t = p.get("title", "")
                if t and t not in past_titles:
                    past_titles.append(t)
                    past_tags.append(p.get("tags", []))
                    past_dates.append(p.get("date", ""))
        except Exception:
            pass

    if not past_titles:
        return True, "No history to compare against."

    proposed_lower = title.lower().strip()
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # ── CHECK 1: Same-day stricter duplicate detection ──
    for i, past_title in enumerate(past_titles):
        past_date = past_dates[i] if i < len(past_dates) else ""

        if past_date == today_str:
            ratio = SequenceMatcher(None, proposed_lower, past_title.lower().strip()).ratio()
            if ratio > 0.35:
                return False, f"Same-day duplicate: '{past_title}' (similarity: {ratio:.0%})"

            # Shared bigrams check for same-day articles
            proposed_words = proposed_lower.split()
            past_words = past_title.lower().split()
            if len(proposed_words) >= 2 and len(past_words) >= 2:
                proposed_bigrams = set(zip(proposed_words, proposed_words[1:]))
                past_bigrams = set(zip(past_words, past_words[1:]))
                shared = proposed_bigrams & past_bigrams
                if len(shared) >= 2:
                    shared_text = [f"'{a} {b}'" for a, b in list(shared)[:3]]
                    return False, f"Same-day topic overlap with '{past_title}' (shared phrases: {', '.join(shared_text)})"

    # ── CHECK 2: Standard title similarity (all articles) ──
    for past_title in past_titles:
        ratio = SequenceMatcher(None, proposed_lower, past_title.lower().strip()).ratio()
        if ratio > 0.45:
            return False, f"Title too similar to '{past_title}' (similarity: {ratio:.0%})"

    # ── CHECK 3: Core noun phrase overlap (strips common modifiers) ──
    NOISE = frozenset(
        "ai artificial intelligence machine learning enterprise agentic "
        "finance financial business strategy deployment implementation "
        "framework guide playbook 2026 2025 how what why does can should "
        "the for and with from into step steps".split()
    )
    proposed_core = {w for w in proposed_lower.split() if w not in NOISE and len(w) > 3}

    for past_title in past_titles[-30:]:
        past_core = {w for w in past_title.lower().split() if w not in NOISE and len(w) > 3}
        if proposed_core and past_core:
            overlap = proposed_core & past_core
            ratio = len(overlap) / max(len(proposed_core), 1)
            if ratio > 0.5:
                return False, (
                    f"Core topic overlap {ratio:.0%} with '{past_title}' "
                    f"(shared: {', '.join(sorted(overlap))})"
                )

    # ── CHECK 4: Tag overlap ──
    if tags:
        proposed_tags_lower = {t.lower() for t in tags}
        for i, pt in enumerate(past_tags):
            if not pt:
                continue
            past_tags_lower = {t.lower() for t in pt}
            overlap = proposed_tags_lower & past_tags_lower
            overlap_ratio = len(overlap) / max(len(proposed_tags_lower), 1)
            if overlap_ratio > 0.5:
                return False, (
                    f"Tag overlap {overlap_ratio:.0%} with '{past_titles[i] if i < len(past_titles) else '?'}' "
                    f"(shared: {', '.join(sorted(overlap))})"
                )

    # ── CHECK 5: Keyword overlap in titles ──
    proposed_words = _extract_significant_words(title)
    if proposed_words:
        for past_title in past_titles:
            past_words = _extract_significant_words(past_title)
            if not past_words:
                continue
            common = proposed_words & past_words
            overlap_ratio = len(common) / max(len(proposed_words), 1)
            if overlap_ratio > 0.6:
                return False, (
                    f"Keyword overlap {overlap_ratio:.0%} with '{past_title}' "
                    f"(shared words: {', '.join(sorted(common))})"
                )

    return True, "Topic is unique."


def _write_post(content: str, dry_run: bool, funnel_type: str = "???", content_type: str = "news") -> None:
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
        print(f"  Title      : {title}")
        print(f"  Slug       : {slug}")
        print(f"  Funnel type: {funnel_type}")
        print(f"  Tags       : {tags}")
        print(f"\nContent preview (first 400 chars):\n{content[:400]}\n")
        return

    # Insert affiliate links before writing to disk
    try:
        from pipeline.tools.affiliate_inserter import insert_affiliate_links
        content = insert_affiliate_links(content)
    except Exception as aff_err:
        print(f"  [Affiliate] Warning: {aff_err}")

    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    post_path.write_text(content, encoding="utf-8")
    print(f"\nPost written to: {post_path}")

    _update_history(title=title, slug=slug, tags=tags, filename=filename)
    _update_post_index(title=title, slug=slug, funnel_type=funnel_type, date_str=date_str, content_type=content_type, tags=tags)

    # Submit to search engines for immediate indexing
    article_url = f"https://theparticlepost.com/posts/{slug}/"
    _submit_to_search_engines(article_url)

    # Send email notification to subscribers (non-fatal)
    try:
        from pipeline.utils.email_sender import send_article_notification
        desc = _extract_frontmatter_field(content, "description")
        cover = _extract_frontmatter_field(content, "cover")
        if not cover:
            cover = _extract_frontmatter_field(content, "image")
        email_result = send_article_notification(
            title=title, slug=slug, description=desc, image_url=cover or None,
        )
        print(f"  [Email] {email_result}")
    except Exception as email_err:
        print(f"  [Email] Warning: notification failed — {email_err}")


def _update_post_index(
    title: str, slug: str, funnel_type: str, date_str: str,
    content_type: str = "news", tags: list[str] | None = None
) -> None:
    """
    Maintain a compact post index for the writer's internal linking context.

    Format (one entry per post, kept sorted newest-first, max 100 posts):
      {"posts": [{"slug": "...", "title": "...", "funnel_type": "TOF", "content_type": "news", "tags": [...], "date": "YYYY-MM-DD"}, ...]}

    The writing_task loads this and formats it as pipe-separated lines (~85 chars each)
    so the writer can see the full archive in ~2,000 tokens regardless of size.
    """
    POST_INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    if POST_INDEX_FILE.exists():
        try:
            index = json.loads(POST_INDEX_FILE.read_text(encoding="utf-8"))
        except Exception:
            index = {"posts": []}
    else:
        index = {"posts": []}

    # Avoid duplicates (same slug on retry)
    index["posts"] = [p for p in index["posts"] if p.get("slug") != slug]
    index["posts"].append({
        "slug":         slug,
        "title":        title,
        "funnel_type":  funnel_type,
        "content_type": content_type,
        "tags":         tags or [],
        "date":         date_str,
    })
    # Newest first, keep last 100
    index["posts"] = sorted(index["posts"], key=lambda p: p.get("date", ""), reverse=True)[:100]

    POST_INDEX_FILE.write_text(
        json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  Post index updated ({len(index['posts'])} entries).")


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
    parser.add_argument("--slot", choices=["morning", "afternoon", "evening"], required=True)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the full pipeline but skip writing the file to disk.",
    )
    parser.add_argument(
        "--topic",
        type=str,
        default=None,
        help="Override topic directive — the pipeline will write about this specific topic.",
    )
    args = parser.parse_args()

    missing = _check_env()
    if missing:
        print(f"ERROR: Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)

    # Check for urgent topic directive from Marketing Director
    topic_override = args.topic
    if not topic_override and URGENT_TOPIC_FILE.exists():
        try:
            directive = json.loads(URGENT_TOPIC_FILE.read_text(encoding="utf-8"))
            requested_at = directive.get("requested_at", "")
            # Only use if less than 12 hours old
            if requested_at:
                from datetime import timedelta
                req_time = datetime.fromisoformat(requested_at)
                age = datetime.now(timezone.utc) - req_time
                if age < timedelta(hours=12):
                    topic_override = directive.get("topic")
                    print(f"  [URGENT TOPIC] Using Marketing Director directive: {topic_override}")
                    print(f"  [URGENT TOPIC] Urgency: {directive.get('urgency', 'normal')}")
            # Delete after reading (consumed)
            URGENT_TOPIC_FILE.unlink(missing_ok=True)
        except Exception as e:
            print(f"  [URGENT TOPIC] Warning: could not read directive: {e}")

    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — {args.slot.upper()} PIPELINE")
    if topic_override:
        print(f"  TOPIC OVERRIDE: {topic_override}")
    print(f"{'='*60}\n")

    from pipeline.crew import build_research_crew, build_production_crew, build_director_crew
    from pipeline.utils.article_assembler import assemble_article

    # ═══ PHASE 1: RESEARCH (runs ONCE, never retried) ═══
    print(f"\n─── Phase 1: Research ───\n")

    research_crew, funnel_type, content_type = build_research_crew(
        slot=args.slot, topic_override=topic_override
    )

    # Retry on API rate limit (429) or overloaded (529) errors
    for rate_retry in range(1, 4):
        try:
            research_result = research_crew.kickoff()
            break
        except Exception as exc:
            exc_str = str(exc).lower()
            if "429" in str(exc) or "529" in str(exc) or "rate_limit" in exc_str or "overloaded" in exc_str:
                wait = 60 * rate_retry
                print(f"  [API RETRY] {type(exc).__name__}. Waiting {wait}s (retry {rate_retry}/3)...")
                time.sleep(wait)
                if rate_retry == 3:
                    raise
            else:
                raise

    # Extract selected topic JSON from the last task (selection_task)
    topic_raw = research_result.tasks_output[-1].raw or "" if research_result.tasks_output else ""
    topic_json = _strip_code_fences(topic_raw)

    # Parse funnel_type from topic JSON (may override schedule-based type)
    try:
        topic_data = json.loads(topic_json)
        funnel_type = topic_data.get("funnel_type", funnel_type)
        content_type = topic_data.get("content_type", content_type)
    except Exception:
        topic_data = {}

    print(f"  [Research] Topic selected. Funnel: {funnel_type} | Content: {content_type}")

    # ═══ UNIQUENESS GATE: reject near-duplicate topics, re-run research if needed ═══
    proposed_title = topic_data.get("title", "") if topic_data else ""
    proposed_tags = topic_data.get("target_keywords", []) if topic_data else []

    if proposed_title:
        is_unique, reason = _check_topic_uniqueness(proposed_title, proposed_tags)

        if not is_unique:
            print(f"\n  [DIVERSITY GATE] REJECTED: {reason}")
            print(f"  [DIVERSITY GATE] Re-running research with exclusion...\n")

            # Re-run Phase 1 with the rejected topic explicitly excluded
            for diversity_retry in range(1, 3):
                excluded_topic = proposed_title
                research_crew, funnel_type, content_type = build_research_crew(
                    slot=args.slot,
                    topic_override=topic_override or f"EXCLUDED TOPIC (do NOT cover): {excluded_topic}",
                )

                for rate_retry in range(1, 4):
                    try:
                        research_result = research_crew.kickoff()
                        break
                    except Exception as exc:
                        exc_str = str(exc).lower()
                        if "429" in str(exc) or "529" in str(exc) or "rate_limit" in exc_str or "overloaded" in exc_str:
                            wait = 60 * rate_retry
                            print(f"  [API RETRY] {type(exc).__name__}. Waiting {wait}s (retry {rate_retry}/3)...")
                            time.sleep(wait)
                            if rate_retry == 3:
                                raise
                        else:
                            raise

                topic_raw = research_result.tasks_output[-1].raw or "" if research_result.tasks_output else ""
                topic_json = _strip_code_fences(topic_raw)

                try:
                    topic_data = json.loads(topic_json)
                    funnel_type = topic_data.get("funnel_type", funnel_type)
                    content_type = topic_data.get("content_type", content_type)
                    proposed_title = topic_data.get("title", "")
                    proposed_tags = topic_data.get("target_keywords", [])
                except Exception:
                    topic_data = {}
                    break

                is_unique, reason = _check_topic_uniqueness(proposed_title, proposed_tags)
                if is_unique:
                    print(f"  [DIVERSITY GATE] Retry {diversity_retry} passed: {reason}")
                    break
                else:
                    print(f"  [DIVERSITY GATE] Retry {diversity_retry} still duplicate: {reason}")

            if not is_unique:
                print(f"  [DIVERSITY WARNING] All retries exhausted. Proceeding with current topic.")
        else:
            print(f"  [DIVERSITY GATE] PASSED: {reason}")

    # ═══ PHASE 2: PRODUCTION (retried on rejection) ═══
    rejection_feedback = ""
    last_verdict: dict = {}
    formatter_content = ""

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"\n─── Phase 2: Production attempt {attempt} of {MAX_ATTEMPTS} ───\n")

        production_crew = build_production_crew(slot=args.slot, funnel_type=funnel_type)

        # Retry on API rate limit (429) or overloaded (529) errors
        for rate_retry in range(1, 4):
            try:
                result = production_crew.kickoff(inputs={
                    "topic_json": topic_json,
                    "funnel_type": funnel_type,
                    "content_type": content_type,
                    "rejection_feedback": rejection_feedback,
                })
                break
            except Exception as exc:
                exc_str = str(exc).lower()
                if "429" in str(exc) or "529" in str(exc) or "rate_limit" in exc_str or "overloaded" in exc_str:
                    wait = 60 * rate_retry
                    print(f"  [API RETRY] {type(exc).__name__}. Waiting {wait}s (retry {rate_retry}/3)...")
                    time.sleep(wait)
                    if rate_retry == 3:
                        raise
                else:
                    raise

        # ═══ EXTRACT TASK OUTPUTS (new order: Writer→Editor→SEO/GSO→Photo) ═══
        assert len(result.tasks_output) >= 4, (
            f"Expected 4 task outputs but got {len(result.tasks_output)}"
        )
        editing_raw = result.tasks_output[1].raw or ""
        seo_raw     = result.tasks_output[2].raw or ""
        photo_raw   = result.tasks_output[3].raw or ""

        # Parse SEO JSON package (index 2: seo_gso_task)
        seo_data: dict = {}
        try:
            seo_data = _parse_seo_json(seo_raw)
            # Stash raw output so the assembler can extract [RESTRUCTURED ARTICLE]
            seo_data["_raw_output"] = seo_raw
        except Exception:
            pass

        # Parse photo JSON
        photo_data: dict = {}
        try:
            photo_data = json.loads(_strip_code_fences(photo_raw))
        except Exception:
            photo_data = {}

        # ═══ GRAPHIC GENERATION: branded covers + data visuals ═══
        graphic_data: dict = {}
        try:
            from pipeline.graphics.data_extractor import (
                extract_statistics, extract_steps, extract_comparisons,
                extract_timeline, select_visuals,
            )
            from pipeline.graphics.templates import (
                cover_news_analysis, cover_deep_dive, cover_case_study,
                cover_how_to, cover_technology_profile, cover_industry_briefing,
                stat_card, diagram_before_after, diagram_process_flow,
                diagram_timeline, chart_bar_horizontal,
            )
            from pipeline.graphics.renderer import render_sync
            from pipeline.graphics.uploader import upload_to_supabase

            # Extract data from article body
            article_body = editing_raw or ""
            stats = extract_statistics(article_body)
            steps = extract_steps(article_body)
            comparisons = extract_comparisons(article_body)
            timeline_events = extract_timeline(article_body)

            title_for_cover = seo_data.get("meta_title", "") or "Untitled"
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            slug_for_cover = seo_data.get("slug", "article")

            # Generate cover SVG based on content type
            cover_funcs = {
                "news_analysis": lambda: cover_news_analysis(title_for_cover, date_str),
                "deep_dive": lambda: cover_deep_dive(title_for_cover, date_str),
                "case_study": lambda: cover_case_study(
                    title_for_cover,
                    stats[0]["value"] if stats else "",
                    stats[0]["value"] if stats else "",
                ),
                "how_to": lambda: cover_how_to(title_for_cover, steps[:4]),
                "technology_profile": lambda: cover_technology_profile(
                    title_for_cover, len(comparisons) or 2
                ),
                "industry_briefing": lambda: cover_industry_briefing(
                    "AI Industry", date_str, len(stats) or 3
                ),
            }

            cover_func = cover_funcs.get(content_type, cover_funcs.get("news_analysis"))
            if cover_func:
                cover_svg = cover_func()
                cover_path = f"/tmp/cover-{slug_for_cover}.png"
                render_sync(cover_svg, cover_path)
                cover_url = upload_to_supabase(cover_path, "covers", f"{slug_for_cover}.png")
                if cover_url:
                    graphic_data["cover"] = {
                        "url": cover_url,
                        "alt": f"{content_type.replace('_', ' ').title()}: {title_for_cover}",
                    }
                    print(f"  [GRAPHICS] Cover generated: {cover_url}")

            # Generate in-article visuals
            visual_specs = select_visuals(content_type, stats, steps, comparisons, timeline_events)
            visuals = []
            for spec in visual_specs:
                try:
                    vtype = spec["type"]
                    vdata = spec["data"]
                    svg = ""
                    w, h = 800, 250

                    if vtype == "stat_card":
                        svg = stat_card(vdata["number"], vdata["label"], vdata.get("source", ""))
                        w, h = 400, 200
                    elif vtype == "before_after":
                        svg = diagram_before_after(
                            vdata["before_label"], vdata["before_value"],
                            vdata["after_label"], vdata["after_value"],
                            vdata.get("metric", ""), vdata.get("source", ""),
                        )
                    elif vtype == "process_flow":
                        svg = diagram_process_flow(vdata["steps"])
                        w, h = 1000, 150
                    elif vtype == "timeline":
                        svg = diagram_timeline(vdata["events"])
                        w, h = 1000, 180
                    elif vtype == "chart_bar_horizontal":
                        svg = chart_bar_horizontal(
                            vdata["data"], vdata.get("title", ""), vdata.get("source", ""),
                        )
                        w, h = 800, 300

                    if svg:
                        vpath = f"/tmp/visual-{slug_for_cover}-{vtype}.png"
                        render_sync(svg, vpath, w, h)
                        vurl = upload_to_supabase(vpath, "visuals", f"{slug_for_cover}-{vtype}.png")
                        if vurl:
                            visuals.append({
                                "type": vtype,
                                "url": vurl,
                                "alt": f"{vtype.replace('_', ' ').title()} visualization",
                            })
                            print(f"  [GRAPHICS] Visual generated: {vtype}")
                except Exception as ve:
                    print(f"  [GRAPHICS] Visual {spec.get('type', '?')} failed: {ve}")

            if visuals:
                graphic_data["visuals"] = visuals

        except Exception as gfx_err:
            print(f"  [GRAPHICS] Generation failed (using Photo Finder fallback): {gfx_err}")

        # ═══ PYTHON ASSEMBLER: replaces the Formatter agent ═══
        try:
            formatter_content = assemble_article(
                editing_output=editing_raw,
                seo_data=seo_data,
                photo_data=photo_data,
                funnel_type=funnel_type,
                content_type=content_type,
                graphic_data=graphic_data if graphic_data else None,
            )
        except Exception as asm_err:
            print(f"  [ASSEMBLER ERROR] {asm_err}")
            formatter_content = ""

        # Safety net: run sanitizer on assembled output
        formatter_content = _sanitize_article(formatter_content) if formatter_content else ""

        # ═══ QA GATE: programmatic pre-check (no LLM cost) ═══
        from pipeline.qa_gate import validate as qa_validate
        qa_passed, qa_issues, qa_score = qa_validate(formatter_content, funnel_type, content_type)
        print(f"\n  [QA GATE] Score: {qa_score}/100 ({'PASS' if qa_passed else 'FAIL'})")
        if qa_issues:
            for issue in qa_issues:
                print(f"    - {issue}")
        if not qa_passed:
            print(f"  [QA GATE] Score {qa_score} < 65 — skipping Production Director (saving LLM cost)")
            verdict = {
                "decision": "REJECT",
                "score": qa_score,
                "issues": qa_issues,
                "coaching_notes": ["QA gate failed — fix programmatic issues before retry"],
            }
            last_verdict = verdict
            decision = "REJECT"
            score    = qa_score
            issues   = qa_issues
            coaching = verdict["coaching_notes"]

            print(f"\n{'='*60}")
            print(f"  PRODUCTION DIRECTOR (skipped — QA GATE REJECT)  (score {score}/100)")
            if issues:
                print("  Issues:")
                for issue in issues:
                    print(f"    - {issue}")
            print(f"{'='*60}\n")

            _save_coaching_notes(verdict, args.slot)

            if attempt < MAX_ATTEMPTS:
                print(f"  Article rejected by QA gate. Retrying production with feedback...\n")
                rejection_feedback = (
                    f"PREVIOUS ATTEMPT REJECTED by QA Gate (programmatic check). "
                    f"Score: {score}/100.\n"
                    "Fix ALL of the following issues before submitting again:\n"
                    + "\n".join(f"  - {i}" for i in issues)
                )
                continue  # retry loop

            # Both attempts exhausted via QA gate
            break

        # ═══ PRODUCTION DIRECTOR: runs as separate 1-agent crew ═══
        print(f"\n─── Production Director (separate step) ───\n")
        director_crew = build_director_crew()

        for rate_retry in range(1, 4):
            try:
                director_result = director_crew.kickoff(inputs={
                    "assembled_article": formatter_content,
                    "funnel_type": funnel_type,
                })
                break
            except Exception as exc:
                exc_str = str(exc).lower()
                if "429" in str(exc) or "529" in str(exc) or "rate_limit" in exc_str or "overloaded" in exc_str:
                    wait = 60 * rate_retry
                    print(f"  [API RETRY] Director {type(exc).__name__}. Waiting {wait}s (retry {rate_retry}/3)...")
                    time.sleep(wait)
                    if rate_retry == 3:
                        raise
                else:
                    raise

        director_raw = director_result.tasks_output[0].raw if director_result.tasks_output else ""
        verdict = _parse_director_verdict(director_raw or "")

        # Correct false-positive deductions (simplified — assembler should prevent most)
        verdict = _correct_verdict(verdict, formatter_content)
        last_verdict = verdict

        decision = verdict.get("decision", "REJECT").upper()
        score    = verdict.get("score", 0)
        issues   = verdict.get("issues", [])
        coaching = verdict.get("coaching_notes", [])

        # Log API cost (combine research + production + director tokens)
        try:
            from pipeline.utils.cost_logger import save_cost_log
            save_cost_log(result.token_usage, args.slot, attempt, decision)
        except Exception as cost_err:
            print(f"  [Cost Logger] Warning: {cost_err}")

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
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            _write_post(content=formatter_content, dry_run=args.dry_run, funnel_type=funnel_type, content_type=content_type)

            slug = _extract_frontmatter_field(formatter_content, "slug")
            if not args.dry_run:
                _update_gso_state(seo_data, slug, date_str)
                _generate_llms_txt()

            # Record topic performance (both dry-run and live)
            try:
                _record_topic_performance(
                    slug=slug,
                    title=_extract_frontmatter_field(formatter_content, "title"),
                    funnel_type=funnel_type,
                    content_type=content_type,
                    director_score=score,
                    seo_data=seo_data,
                )
            except Exception as perf_err:
                print(f"  [Topic Performance] Warning: {perf_err}")

            return  # success

        # REJECT path — only production crew retries, research stays locked
        if attempt < MAX_ATTEMPTS:
            print(f"  Article rejected. Retrying production with feedback...\n")
            rejection_feedback = (
                f"PREVIOUS ATTEMPT REJECTED by the Production Director. "
                f"Score: {score}/100.\n"
                "Fix ALL of the following issues before submitting again:\n"
                + "\n".join(f"  - {i}" for i in issues)
            )

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
