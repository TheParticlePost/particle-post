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

from pipeline.utils.research_memory import record_research_run, record_article_outcome, classify_domain

MAX_ATTEMPTS = 2


# ──────────────────────────────────────────────────────────────────────────────
# Environment helpers
# ──────────────────────────────────────────────────────────────────────────────

def _check_env() -> list[str]:
    required = ["ANTHROPIC_API_KEY", "TAVILY_API_KEY"]
    return [var for var in required if not os.environ.get(var)]


# ──────────────────────────────────────────────────────────────────────────────
# Graphics helpers
# ──────────────────────────────────────────────────────────────────────────────

def _extract_company_for_cover(title: str) -> str:
    """Extract company name from a case study title for the cover graphic.

    Handles: "Walmart AI Supply Chain: How It Cut Costs 40%"
             "How Klarna Cut 700 Support Jobs With AI"
             "JPMorgan COiN AI Contract Intelligence Case Study"
    """
    # "Company ...: subtitle" → take before colon
    if ":" in title:
        return title.split(":")[0].strip()
    # "How Company Verb..." → extract company
    m = re.match(r"How\s+(.+?)\s+(?:Cut|Reduce|Deploy|Achieve|Save|Built|Launch)", title)
    if m:
        return m.group(1).strip()
    # Fallback: first 3 words
    return " ".join(title.split()[:3])


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

    # Also catch a second frontmatter block (---\ntitle:) appearing mid-content.
    # IMPORTANT: a bare "---" line is also a Markdown horizontal rule, so we
    # must NOT treat every "---" as a frontmatter delimiter. Only count it as
    # a frontmatter open if it is immediately followed by a YAML scalar field
    # (e.g. "title:", "slug:", "date:", "description:").
    frontmatter_open_re = re.compile(
        r'^---\s*\n(?:title|slug|date|description|draft|tags|categories|image):',
        re.MULTILINE,
    )
    frontmatter_blocks = list(frontmatter_open_re.finditer(content))
    if len(frontmatter_blocks) >= 2:
        # Keep only content up to the second frontmatter open
        content = content[:frontmatter_blocks[1].start()].rstrip()
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

    # 4. Fix Hugo shortcode attributes containing backslash-escaped double quotes.
    #    The writer LLM occasionally emits JSON inside a shortcode `data="..."`
    #    attribute, with escapes like `data="[{\"x\":\"Step 1\"}]"`. Those
    #    backslashes are invalid in JSX/MDX attribute syntax and next-mdx-remote
    #    refuses to parse them, which breaks the entire Vercel build for the
    #    offending post (and the home page, since it prerenders every post).
    #    Convert any affected attribute to single-quoted form and strip the
    #    backslashes — both Hugo's shortcode parser and the remark-to-JSX
    #    converter accept single-quoted attribute values.
    content, shortcode_fix_count = _fix_shortcode_escapes(content)
    if shortcode_fix_count > 0:
        fixes_applied.append(
            f"Fixed {shortcode_fix_count} shortcode(s) with backslash-escaped quotes"
        )

    if fixes_applied:
        print(f"\n  [SANITIZER] {'; '.join(fixes_applied)}")
    else:
        print(f"\n  [SANITIZER] Article clean, no fixes needed.")

    return content


# Matches a full Hugo shortcode block `{{< name attr1="..." attr2="..." >}}`.
# The attrs group (group 2) is greedy-but-bounded: any character except `>`,
# which is safe because `>` cannot legitimately appear inside an attribute
# value in our shortcode conventions.
_SHORTCODE_RE = re.compile(r'\{\{<\s*([\w-]+)((?:\s+[^>]*?)?)\s*>\}\}', re.DOTALL)
# C-string-style attr matcher: handles backslash-escaped quotes correctly by
# matching either (a) any non-quote non-backslash char, or (b) backslash + any.
_ATTR_RE = re.compile(r'([\w-]+)="((?:[^"\\]|\\.)*)"')


def _fix_shortcode_escapes(body: str) -> tuple[str, int]:
    """Rewrite shortcode attributes containing `\\\"` so MDX can parse them.

    Only touches shortcodes whose attribute list contains at least one
    backslash-escaped double quote. For each affected attribute, strips the
    backslashes and wraps the value in single quotes. Other attributes in
    the same shortcode are left byte-identical.
    """
    fix_count = 0

    def _rewrite(match: "re.Match[str]") -> str:
        nonlocal fix_count
        name = match.group(1)
        attrs = match.group(2)
        if '\\"' not in attrs:
            return match.group(0)

        def _swap(attr_match: "re.Match[str]") -> str:
            attr_name = attr_match.group(1)
            raw = attr_match.group(2)
            if '\\"' not in raw:
                return attr_match.group(0)
            cleaned = raw.replace('\\"', '"')
            # Single-quoted JSX attributes cannot contain unescaped `'`.
            # Replace any literal single quotes with the HTML entity.
            cleaned = cleaned.replace("'", "&apos;")
            return f"{attr_name}='{cleaned}'"

        fixed_attrs = _ATTR_RE.sub(_swap, attrs).strip()
        fix_count += 1
        return "{{< " + name + " " + fixed_attrs + " >}}"

    new_body = _SHORTCODE_RE.sub(_rewrite, body)
    return new_body, fix_count


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
    # Only count "---" lines that open a real YAML frontmatter, not horizontal rules
    frontmatter_blocks = list(re.finditer(
        r'^---\s*\n(?:title|slug|date|description|draft|tags|categories|image):',
        sanitized_content, re.MULTILINE,
    ))
    has_duplicate_frontmatter = len(frontmatter_blocks) >= 2
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
    parser.add_argument(
        "--content-type",
        type=str,
        default=None,
        choices=["news_analysis", "deep_dive", "case_study", "how_to", "technology_profile", "industry_briefing"],
        help="Override the scheduled content type for this run.",
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

    # Content type override (CLI flag takes precedence over schedule)
    content_type_override = getattr(args, "content_type", None)

    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — {args.slot.upper()} PIPELINE")
    if topic_override:
        print(f"  TOPIC OVERRIDE: {topic_override}")
    if content_type_override:
        print(f"  CONTENT TYPE OVERRIDE: {content_type_override}")
    print(f"{'='*60}\n")

    from pipeline.crew import build_research_crew, build_production_crew, build_director_crew
    from pipeline.utils.article_assembler import assemble_article
    from pipeline.tasks.selection_task import _CONTENT_TYPE_TO_FUNNEL

    # ═══ PHASE 1: RESEARCH (runs ONCE, never retried) ═══
    print(f"\n─── Phase 1: Research ───\n")

    research_crew, funnel_type, content_type = build_research_crew(
        slot=args.slot, topic_override=topic_override
    )

    # Apply content type override if specified
    if content_type_override:
        content_type = content_type_override
        funnel_type = _CONTENT_TYPE_TO_FUNNEL.get(content_type, funnel_type)
        # Rebuild research crew with correct content type
        research_crew, _, _ = build_research_crew(
            slot=args.slot, topic_override=topic_override
        )
        # Patch the research task's content_type by rebuilding
        from pipeline.tasks.research_task import build_research_task
        research_crew.tasks[0] = build_research_task(
            research_crew.agents[0], content_type=content_type, topic_override=topic_override
        )
        print(f"  [Override] Content type: {content_type} | Funnel: {funnel_type}")

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

    # Re-apply CLI content-type override (locked — Topic Selector cannot override)
    if content_type_override:
        content_type = content_type_override
        funnel_type = _CONTENT_TYPE_TO_FUNNEL.get(content_type, funnel_type)

    print(f"  [Research] Topic selected. Funnel: {funnel_type} | Content: {content_type}")

    # Record research run in memory
    proposed_title = topic_data.get("title", "") if topic_data else ""
    try:
        record_research_run(
            slot=args.slot,
            content_type=content_type,
            queries_used=[],
            topics_found=len(topic_data.get("source_urls", [])) if topic_data else 0,
            topic_selected=proposed_title,
        )
    except Exception as mem_err:
        print(f"  [Research Memory] Warning: {mem_err}")

    # ═══ UNIQUENESS GATE: reject near-duplicate topics, re-run research if needed ═══
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

    # ═══ FINANCIAL DEPTH: SEC EDGAR brief for case_study / deep_dive ═══
    # For US public companies, pull authoritative 10-K data and append it
    # to the topic_json so the writer can cite specific line items instead
    # of vague "per Bloomberg" references.
    financial_brief = ""
    if content_type in ("case_study", "deep_dive"):
        try:
            from pipeline.tools.sec_edgar_tool import (
                company_financial_brief,
                resolve_ticker,
            )

            # Extract candidate company names from the topic title + summary
            _title = (topic_data.get("title", "") if isinstance(topic_data, dict) else "")
            _summary = (topic_data.get("summary", "") if isinstance(topic_data, dict) else "")
            _haystack = f"{_title} {_summary}"

            # Try each capitalized 1-3 word phrase against the SEC cache
            import re as _re_sec
            _candidates = _re_sec.findall(
                r"\b([A-Z][A-Za-z0-9&.]+(?:\s+[A-Z][A-Za-z0-9&.]+){0,2})\b",
                _haystack,
            )
            _seen = set()
            _ordered_candidates = []
            for _c in _candidates:
                _ck = _c.lower()
                if _ck not in _seen:
                    _seen.add(_ck)
                    _ordered_candidates.append(_c)

            _resolved = None
            for _cand in _ordered_candidates[:8]:
                _r = resolve_ticker(_cand)
                if _r:
                    _resolved = _r
                    break

            if _resolved:
                print(f"  [SEC] Resolved '{_resolved['name']}' ({_resolved['ticker']}, CIK {_resolved['cik']})")
                _found, _brief = company_financial_brief(_resolved["name"])
                if _found:
                    financial_brief = _brief
                    print(f"  [SEC] Financial brief attached ({len(_brief)} chars)")
                else:
                    print(f"  [SEC] No usable metrics: {_brief}")
            else:
                print("  [SEC] No US public company matched — writer will use Tavily/IR fallback only")
        except Exception as sec_err:
            print(f"  [SEC] Error (non-fatal): {sec_err}")

    # If we got an SEC brief, inject it into the topic_json so the writer sees it.
    if financial_brief and isinstance(topic_data, dict):
        topic_data["financial_data"] = financial_brief
        topic_json = json.dumps(topic_data)

    # ═══ PHASE 2: PRODUCTION (retried on rejection) ═══
    rejection_feedback = ""
    last_verdict: dict = {}
    formatter_content = ""

    for attempt in range(1, MAX_ATTEMPTS + 1):
        print(f"\n─── Phase 2: Production attempt {attempt} of {MAX_ATTEMPTS} ───\n")

        production_crew = build_production_crew(slot=args.slot, funnel_type=funnel_type, content_type=content_type)

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
        # Accumulate Gemini usage reported by the cover CLI so the cost
        # logger can include it in this run's final cost record.
        _gemini_run_usage: dict = {"image_count": 0, "cost_usd": 0.0}

        # Import graphics modules (shared by cover + visuals)
        try:
            from pipeline.graphics.data_extractor import (
                extract_statistics, extract_steps, extract_comparisons,
                extract_timeline, select_visuals,
            )
            from pipeline.graphics.templates import (
                stat_card, diagram_before_after, diagram_process_flow,
                diagram_timeline, chart_bar_horizontal,
            )
            from pipeline.graphics.renderer import render_sync
            from pipeline.graphics.uploader import upload_to_supabase
            _graphics_available = True
        except Exception as import_err:
            print(f"  [GRAPHICS] Import failed, skipping graphics: {import_err}")
            _graphics_available = False

        if _graphics_available:
            # Extract data from article body
            article_body = editing_raw or ""
            stats = extract_statistics(article_body)
            steps = extract_steps(article_body)
            comparisons = extract_comparisons(article_body)
            timeline_events = extract_timeline(article_body)

            title_for_cover = seo_data.get("meta_title", "") or "Untitled"
            date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            slug_for_cover = seo_data.get("slug", "article")

            # --- Cover generation via TypeScript (lib/covers/) bridge ---
            # Default: Mode E (background-image with a Gemini-generated photo).
            # Fallback: per-content-type Mode A/B/C/D if Mode E fails.
            try:
                import json as _json_cover
                import subprocess as _subprocess_cover
                import tempfile as _tempfile_cover
                from pathlib import Path as _PathCover
                from pipeline.utils.cover_prompt import build_cover_prompt as _build_cover_prompt

                # Per-content-type category labels (used in both modes)
                _category_labels = {
                    "news_analysis":      "NEWS ANALYSIS",
                    "industry_briefing":  "INDUSTRY BRIEFING",
                    "deep_dive":          "DEEP DIVE",
                    "case_study":         "CASE STUDY",
                    "how_to":             "HOW-TO",
                    "technology_profile": "TECHNOLOGY PROFILE",
                }
                _category = _category_labels.get(content_type, "NEWS ANALYSIS")

                # Per-content-type fallback mode if Mode E fails entirely
                _fallback_mode_map = {
                    "news_analysis":      "big-stat",
                    "industry_briefing":  "big-stat",
                    "deep_dive":          "headline-hook",
                    "case_study":         "big-stat",
                    "how_to":             "framework",
                    "technology_profile": "comparison",
                }

                def _distill_hook(t: str) -> str:
                    """Cheap hook text: take after the last colon, else last clause."""
                    if ":" in t:
                        tail = t.split(":")[-1].strip()
                        if tail:
                            return tail
                    return t.strip()

                _categories = seo_data.get("categories", []) or []
                _primary_category = _categories[0] if _categories else ""

                # Prefer the LLM-crafted prompt from the photo agent;
                # fall back to the heuristic builder if absent or empty.
                _llm_prompt = (photo_data.get("cover_image_prompt") or "").strip()
                _gemini_prompt = _llm_prompt or _build_cover_prompt(
                    title_for_cover, content_type, _primary_category,
                )
                _prompt_source = "llm" if _llm_prompt else "heuristic"

                # Build Mode E config (the default)
                _mode_e_config = {
                    "title": title_for_cover,
                    "slug": slug_for_cover,
                    "category": _category,
                    "date": date_str,
                    "coverMode": "background-image",
                    "hookText": _distill_hook(title_for_cover),
                    "geminiPrompt": _gemini_prompt,
                }
                if stats:
                    _mode_e_config["hookStat"] = stats[0].get("value", "")

                def _build_legacy_config(mode: str) -> dict:
                    """Build a Mode A/B/C/D config as the fallback."""
                    cfg = {
                        "title": title_for_cover,
                        "slug": slug_for_cover,
                        "category": _category,
                        "date": date_str,
                        "coverMode": mode,
                    }
                    if mode == "big-stat":
                        if stats:
                            cfg["hookStat"] = stats[0].get("value", "")
                            cfg["hookContext"] = stats[0].get("label", "") or title_for_cover
                        else:
                            cfg["coverMode"] = "headline-hook"
                            cfg["hookText"] = _distill_hook(title_for_cover)
                    elif mode == "headline-hook":
                        cfg["hookText"] = _distill_hook(title_for_cover)
                    elif mode == "comparison":
                        if comparisons:
                            _c = comparisons[0]
                            cfg["comparisonLeft"] = {
                                "name": _c.get("left_name", "Option A"),
                                "metric": _c.get("left_metric", ""),
                                "detail": _c.get("left_detail", ""),
                            }
                            cfg["comparisonRight"] = {
                                "name": _c.get("right_name", "Option B"),
                                "metric": _c.get("right_metric", ""),
                                "detail": _c.get("right_detail", ""),
                            }
                        else:
                            cfg["coverMode"] = "headline-hook"
                            cfg["hookText"] = _distill_hook(title_for_cover)
                    elif mode == "framework":
                        _step_labels = [
                            (s.get("label", s) if isinstance(s, dict) else str(s))
                            for s in steps[:4]
                        ]
                        if len(_step_labels) >= 3:
                            cfg["frameworkSteps"] = _step_labels
                            cfg["frameworkName"] = title_for_cover.split(":")[0][:40]
                        else:
                            cfg["coverMode"] = "headline-hook"
                            cfg["hookText"] = _distill_hook(title_for_cover)
                    return cfg

                _project_root = _PathCover(__file__).resolve().parents[1]
                _tmp_dir = _PathCover(_tempfile_cover.gettempdir())
                _tmp_out = _tmp_dir
                _cli_path = _project_root / "lib" / "covers" / "cli.ts"

                def _run_cover_cli(cfg: dict, tag: str) -> tuple:
                    """Write config to tmp, shell out to the TS CLI, parse stdout.

                    Returns (success: bool, paths: list[str], gem_imgs: int, gem_cost: float).
                    """
                    tmp_cfg = _tmp_dir / f"cover-config-{slug_for_cover}-{tag}.json"
                    tmp_cfg.write_text(_json_cover.dumps(cfg), encoding="utf-8")
                    proc = _subprocess_cover.run(
                        [
                            "npx", "tsx", str(_cli_path),
                            "--config", str(tmp_cfg),
                            "--output", str(_tmp_out),
                        ],
                        capture_output=True, text=True, timeout=180,
                        cwd=str(_project_root),
                        shell=(os.name == "nt"),
                    )
                    # Try to parse a JSON success line from stdout regardless
                    # of exit code. On Windows, Node sometimes hits a libuv
                    # assertion during shutdown AFTER the CLI has already
                    # printed its result JSON and written the PNG to disk.
                    # We salvage these runs by checking stdout first.
                    parsed = None
                    stdout = (proc.stdout or "").strip()
                    if stdout:
                        try:
                            parsed = _json_cover.loads(stdout.splitlines()[-1])
                        except Exception:
                            parsed = None

                    if parsed and isinstance(parsed.get("paths"), list) and parsed["paths"]:
                        if proc.returncode != 0:
                            print(f"  [GRAPHICS] {tag} (Node cleanup crashed but image was generated)")
                        gem = parsed.get("geminiUsage") or {}
                        return (
                            True,
                            parsed.get("paths", []),
                            int(gem.get("imageCount", 0) or 0),
                            float(gem.get("estimatedCostUsd", 0.0) or 0.0),
                        )

                    if proc.returncode != 0:
                        err = (proc.stderr or "").strip().splitlines()[-1] if proc.stderr else ""
                        print(f"  [GRAPHICS] {tag} CLI failed: {err[:240]}")
                        return (False, [], 0, 0.0)

                    print(f"  [GRAPHICS] {tag} stdout had no parseable JSON")
                    return (False, [], 0, 0.0)

                # Attempt 1: Mode E (background-image + Gemini)
                print(
                    f"  [GRAPHICS] Cover attempt: Mode E "
                    f"(prompt={_prompt_source})"
                )
                _ok, _cover_paths, _gem_imgs, _gem_cost = _run_cover_cli(
                    _mode_e_config, "modeE",
                )
                _used_mode = "background-image"

                # Attempt 2: per-content-type fallback if Mode E failed
                if not _ok:
                    _fallback_mode = _fallback_mode_map.get(content_type, "headline-hook")
                    print(f"  [GRAPHICS] Falling back to {_fallback_mode}")
                    _legacy_cfg = _build_legacy_config(_fallback_mode)
                    _ok, _cover_paths, _gem_imgs2, _gem_cost2 = _run_cover_cli(
                        _legacy_cfg, "fallback",
                    )
                    _used_mode = _legacy_cfg["coverMode"]
                    _gem_imgs += _gem_imgs2
                    _gem_cost += _gem_cost2

                if _gem_imgs > 0:
                    _gemini_run_usage["image_count"] += _gem_imgs
                    _gemini_run_usage["cost_usd"] += _gem_cost
                    print(
                        f"  [GRAPHICS] Gemini: +{_gem_imgs} image(s), "
                        f"+${_gem_cost:.4f}"
                    )

                if _ok and _cover_paths:
                    cover_path = _cover_paths[0]
                    cover_url = upload_to_supabase(
                        cover_path, "covers", f"{slug_for_cover}.png",
                    )
                    if cover_url:
                        graphic_data["cover"] = {
                            "url": cover_url,
                            "alt": f"{_category}: {title_for_cover}",
                            "generation": (
                                "gemini-v1" if _used_mode == "background-image" else "fallback-v1"
                            ),
                        }
                        print(f"  [GRAPHICS] Cover generated ({_used_mode}): {cover_url}")
                    else:
                        print(f"  [GRAPHICS] Cover rendered but upload failed")
                else:
                    print(f"  [GRAPHICS] Cover generation failed (no fallback succeeded)")
            except Exception as cover_err:
                print(f"  [GRAPHICS] Cover generation failed: {cover_err}")

            # --- In-article visuals (separate try/except per visual) ---
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
                                "insert_after_heading": spec.get("insert_after_heading", ""),
                            })
                            print(f"  [GRAPHICS] Visual generated: {vtype}")
                        else:
                            print(f"  [GRAPHICS] Visual {vtype} rendered but upload failed")
                except Exception as ve:
                    print(f"  [GRAPHICS] Visual {spec.get('type', '?')} failed: {ve}")

            if visuals:
                graphic_data["visuals"] = visuals

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

        # Log API cost (combine research + production + director tokens,
        # plus any Gemini image generation from the cover step)
        try:
            from pipeline.utils.cost_logger import save_cost_log
            save_cost_log(
                result.token_usage,
                args.slot,
                attempt,
                decision,
                gemini_image_count=_gemini_run_usage.get("image_count", 0),
                gemini_cost_usd=_gemini_run_usage.get("cost_usd", 0.0),
            )
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

            # Record article outcome in research memory
            try:
                article_title = _extract_frontmatter_field(formatter_content, "title")
                article_tags = seo_data.get("tags", [])
                record_article_outcome(
                    topic_title=article_title,
                    director_score=score,
                    content_type=content_type,
                    domain=classify_domain(article_tags),
                )
            except Exception as mem_err:
                print(f"  [Research Memory] Warning: {mem_err}")

            # Publish case study to AI Pulse map (Supabase)
            if content_type == "case_study" and not args.dry_run:
                try:
                    from pipeline.utils.case_study_publisher import publish_case_study_to_pulse
                    publish_case_study_to_pulse(formatter_content, seo_data, slug)
                except Exception as pulse_err:
                    print(f"  [Pulse] Warning: {pulse_err}")

            # Pulse map self-heal: scan every case_study article and insert
            # any that are missing from pulse_case_studies. Runs on EVERY
            # pipeline invocation (morning/afternoon/evening), not just
            # case_study publishes, so a silent failure on one day will
            # be caught on the next run. Cheap: one GET per case_study
            # article, idempotent when all rows already exist.
            if not args.dry_run:
                try:
                    from pipeline.backfill_pulse_map import sync_pulse_map
                    pulse_summary = sync_pulse_map(verbose=False)
                    if not pulse_summary["enabled"]:
                        print("  [Pulse Sync] SKIP (Supabase env vars missing)")
                    elif pulse_summary["inserted"] > 0:
                        inserted = ", ".join(pulse_summary["inserted_slugs"][:5])
                        print(
                            f"  [Pulse Sync] Self-healed {pulse_summary['inserted']} "
                            f"stragglers: {inserted}"
                        )
                    elif pulse_summary["failed"] > 0:
                        failed = ", ".join(pulse_summary["failed_slugs"][:5])
                        print(
                            f"  [Pulse Sync] WARNING: {pulse_summary['failed']} "
                            f"case_study article(s) still failing: {failed}. "
                            f"See pipeline/logs/pulse_failures.jsonl"
                        )
                    else:
                        print(
                            f"  [Pulse Sync] OK ({pulse_summary['scanned']} "
                            f"case studies, all on map)"
                        )
                except Exception as sync_err:
                    print(f"  [Pulse Sync] Error: {sync_err}")

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
