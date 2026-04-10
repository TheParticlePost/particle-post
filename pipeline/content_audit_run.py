#!/usr/bin/env python3
"""
Particle Post — Content Quality Audit

Runs weekly (Mondays at 10am ET) via GitHub Actions.
Reads the last 7 published articles, runs a 12-point quality checklist,
aggregates common issues, and writes coaching notes to writer_feedback.json.

Usage:
    python -m pipeline.content_audit_run
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

_POSTS_DIR     = _REPO_ROOT / "blog" / "content" / "posts"
_FEEDBACK_FILE = _REPO_ROOT / "pipeline" / "data" / "writer_feedback.json"
_POST_INDEX    = _REPO_ROOT / "pipeline" / "config" / "post_index.json"

# AI-tell phrases to scan for
_AI_TELLS = [
    "delve", "game-changing", "transformative", "groundbreaking",
    "unprecedented", "utilize", "seamlessly", "furthermore",
    "moreover", "needless to say", "rest assured", "it's worth noting",
    "landscape", "leverage", "robust", "cutting-edge", "paradigm shift",
]

# Generic H2s to flag
_GENERIC_H2S = {
    "background", "analysis", "discussion", "overview",
    "key developments", "market analysis", "introduction",
    "context", "summary",
}


def _get_recent_articles(n: int = 7) -> list[Path]:
    """Get the N most recent .md files from the posts directory."""
    if not _POSTS_DIR.exists():
        return []
    files = sorted(_POSTS_DIR.glob("*.md"), key=lambda p: p.name, reverse=True)
    return files[:n]


def _extract_frontmatter(content: str) -> dict:
    """Extract YAML frontmatter as a simple dict (basic parsing)."""
    fm = {}
    match = re.match(r'^---\s*\n(.*?)\n---', content, re.DOTALL)
    if not match:
        return fm
    for line in match.group(1).splitlines():
        if ":" in line and not line.startswith(" ") and not line.startswith("-"):
            key, _, val = line.partition(":")
            fm[key.strip()] = val.strip().strip('"').strip("'")
    return fm


def _get_body(content: str) -> str:
    """Extract article body (everything after second ---)."""
    parts = content.split("---", 2)
    if len(parts) >= 3:
        return parts[2].strip()
    return content


def _audit_article(path: Path) -> dict:
    """Run 12-point audit on a single article. Returns check results."""
    content = path.read_text(encoding="utf-8")
    fm = _extract_frontmatter(content)
    body = _get_body(content)
    word_count = len(body.split())

    results = {"file": path.name, "score": 100, "checks": {}, "issues": []}

    # 1. Frontmatter completeness
    required = ["title", "date", "slug", "description", "categories"]
    missing = [f for f in required if not fm.get(f)]
    if missing:
        results["checks"]["frontmatter"] = f"FAIL — missing: {', '.join(missing)}"
        results["issues"].append(f"Missing frontmatter: {', '.join(missing)}")
        results["score"] -= 20
    else:
        results["checks"]["frontmatter"] = "PASS"

    # 2. Cover image
    if "picsum.photos" in content:
        results["checks"]["cover_image"] = "FAIL — picsum.photos placeholder"
        results["issues"].append("Cover image uses picsum.photos placeholder")
        results["score"] -= 15
    else:
        results["checks"]["cover_image"] = "PASS"

    # 3. Word count (basic check without funnel type)
    if word_count < 500:
        results["checks"]["word_count"] = f"FAIL — {word_count} words (too short)"
        results["issues"].append(f"Word count: {word_count} (minimum ~600)")
        results["score"] -= 20
    else:
        results["checks"]["word_count"] = f"PASS — {word_count} words"

    # 4. Source attribution
    citations = len(re.findall(r'according to|per [A-Z]|\breported\b|\bsays\b|\breports\b', body, re.IGNORECASE))
    if citations < 3:
        results["checks"]["citations"] = f"FAIL — {citations} citations (need 3+)"
        results["issues"].append(f"Only {citations} source citations (need at least 3)")
        results["score"] -= 20
    else:
        results["checks"]["citations"] = f"PASS — {citations} citations"

    # 5. AI-tell scan
    found_tells = []
    body_lower = body.lower()
    for phrase in _AI_TELLS:
        if phrase.lower() in body_lower:
            found_tells.append(phrase)
    if found_tells:
        penalty = min(20, len(found_tells) * 10)
        results["checks"]["ai_tells"] = f"FAIL — found: {', '.join(found_tells)}"
        results["issues"].append(f"AI-tell phrases: {', '.join(found_tells)}")
        results["score"] -= penalty
    else:
        results["checks"]["ai_tells"] = "PASS"

    # 6. Article structure (H2 count)
    h2_count = len(re.findall(r'^## ', body, re.MULTILINE))
    if h2_count < 2:
        results["checks"]["structure"] = f"FAIL — {h2_count} H2 headings (need 2+)"
        results["issues"].append(f"Only {h2_count} H2 headings")
        results["score"] -= 10
    else:
        results["checks"]["structure"] = f"PASS — {h2_count} H2 headings"

    # 11. H2 quality
    h2_texts = re.findall(r'^## (.+)$', body, re.MULTILINE)
    generic_h2s = [h2 for h2 in h2_texts if h2.strip().lower() in _GENERIC_H2S]
    if len(generic_h2s) >= 2:
        results["checks"]["h2_quality"] = f"FAIL — generic H2s: {', '.join(generic_h2s)}"
        results["issues"].append(f"Generic H2 headings: {', '.join(generic_h2s)}")
        results["score"] -= 10
    else:
        results["checks"]["h2_quality"] = "PASS"

    # 12. Visual diversity
    has_statbox = "stat-box" in body
    has_blockquote = body.count("> **Key Takeaway") > 0 or body.count("> **") > 0
    if not has_statbox or not has_blockquote:
        missing_visual = []
        if not has_statbox:
            missing_visual.append("stat-box")
        if not has_blockquote:
            missing_visual.append("blockquote/callout")
        results["checks"]["visual_diversity"] = f"FAIL — missing: {', '.join(missing_visual)}"
        results["issues"].append(f"Missing visual elements: {', '.join(missing_visual)}")
        results["score"] -= 5
    else:
        results["checks"]["visual_diversity"] = "PASS"

    # 9. FAQ section
    has_faq = fm.get("has_faq", "").lower() == "true"
    if has_faq and "Frequently Asked Questions" not in body:
        results["checks"]["faq"] = "FAIL — has_faq=true but no FAQ section"
        results["issues"].append("has_faq=true but FAQ section missing")
        results["score"] -= 5
    else:
        results["checks"]["faq"] = "PASS"

    # 10. Internal links
    internal_links = len(re.findall(r'\]\(/posts/', body))
    if internal_links < 1:
        results["checks"]["internal_links"] = f"FAIL — {internal_links} internal links"
        results["issues"].append("No internal links to other posts")
        results["score"] -= 10
    else:
        results["checks"]["internal_links"] = f"PASS — {internal_links} links"

    results["score"] = max(0, results["score"])
    return results


def _write_coaching_notes(audits: list[dict]) -> None:
    """Aggregate audit results and write top coaching notes to feedback file."""
    _FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Count issue frequency
    issue_counts: dict[str, int] = {}
    for audit in audits:
        for issue in audit.get("issues", []):
            # Normalize
            key = re.sub(r'\b\d+\b', 'N', issue)
            issue_counts[key] = issue_counts.get(key, 0) + 1

    # Sort by frequency
    sorted_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)

    # Generate coaching notes from top 5 issues
    coaching_notes = []
    for issue, count in sorted_issues[:5]:
        coaching_notes.append(
            f"[WEEKLY AUDIT] {issue} — found in {count}/{len(audits)} articles this week. "
            "Fix this pattern in future articles."
        )

    if not coaching_notes:
        coaching_notes = ["[WEEKLY AUDIT] All articles passed quality checks this week. Keep it up."]

    # Write to feedback file
    if _FEEDBACK_FILE.exists():
        try:
            data = json.loads(_FEEDBACK_FILE.read_text(encoding="utf-8"))
        except Exception:
            data = {"notes": []}
    else:
        data = {"notes": []}

    ts = datetime.now(timezone.utc).isoformat()
    for note in coaching_notes:
        data["notes"].append({"text": note, "slot": "audit", "date": ts})

    data["notes"] = data["notes"][-30:]
    _FEEDBACK_FILE.write_text(
        json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"  Coaching notes saved ({len(coaching_notes)} new, {len(data['notes'])} total)")


def main() -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"\n{'='*60}")
    print(f"  PARTICLE POST — CONTENT QUALITY AUDIT")
    print(f"  {today}")
    print(f"{'='*60}\n")

    articles = _get_recent_articles(7)
    if not articles:
        print("  No articles found in blog/content/posts/")
        sys.exit(0)

    print(f"  Auditing {len(articles)} most recent articles...\n")

    audits = []
    for path in articles:
        audit = _audit_article(path)
        audits.append(audit)
        status = "PASS" if audit["score"] >= 65 else "FAIL"
        print(f"  [{status}] {audit['file']} — score: {audit['score']}/100")
        for issue in audit.get("issues", []):
            print(f"        - {issue}")

    # Summary
    avg_score = sum(a["score"] for a in audits) / len(audits) if audits else 0
    pass_count = sum(1 for a in audits if a["score"] >= 65)

    print(f"\n  {'='*50}")
    print(f"  SUMMARY: {pass_count}/{len(audits)} passed | Avg score: {avg_score:.0f}/100")
    print(f"  {'='*50}\n")

    _write_coaching_notes(audits)

    # --- AI Pulse map integrity check ---
    # Every case_study article in blog/content/posts/ should have a row
    # in Supabase pulse_case_studies. The pipeline already self-heals on
    # every morning/afternoon/evening run, but a weekly audit catches
    # drift between runs (rare) and surfaces any stuck failures loudly.
    print(f"\n  {'='*50}")
    print(f"  AI PULSE MAP INTEGRITY")
    print(f"  {'='*50}")
    try:
        from pipeline.backfill_pulse_map import sync_pulse_map
        pulse = sync_pulse_map(verbose=False)
        if not pulse["enabled"]:
            print("  [Pulse] SKIP — Supabase env vars not configured")
        else:
            print(f"  Scanned      : {pulse['scanned']} case_study article(s)")
            print(f"  Already synced: {pulse['skipped']}")
            print(f"  Inserted now  : {pulse['inserted']}")
            if pulse["inserted_slugs"]:
                for s in pulse["inserted_slugs"]:
                    print(f"    + {s}")
            if pulse["failed"]:
                print(f"  FAILURES      : {pulse['failed']}")
                for s in pulse["failed_slugs"]:
                    print(f"    ! {s}")
                print(f"  See pipeline/logs/pulse_failures.jsonl for details.")
            else:
                print(f"  Status        : all case studies are on the map")
    except Exception as e:
        print(f"  [Pulse] ERROR: {e}")

    print(f"\n{'='*60}")
    print(f"  CONTENT AUDIT COMPLETE")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
