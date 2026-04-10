"""
Backfill: regenerate the cover image for every published article using
the new lib/covers/ Mode E pipeline (Gemini-generated photo + branded
tint + dark gradient + brand frame).

For each article:
  1. Read frontmatter (pyyaml)
  2. Skip if cover.generation == "gemini-v1" (already migrated, idempotent)
  3. Build a heuristic Gemini prompt from title + content_type + category
  4. Shell out to `npx tsx lib/covers/cli.ts` with a Mode E config
  5. Upload the resulting PNG to Supabase Storage (overwrites the existing
     object at the same URL — no frontmatter URL change)
  6. Update frontmatter: cover.alt, cover.generation, image_credit_source
  7. Print per-article cost + status

Usage:
    python -m pipeline.backfill_covers                    # full backfill
    python -m pipeline.backfill_covers --dry-run          # preview only
    python -m pipeline.backfill_covers --limit 3          # process N articles
    python -m pipeline.backfill_covers --slug walmart     # match slug
    python -m pipeline.backfill_covers --force            # re-process gemini-v1
    python -m pipeline.backfill_covers --start-from <slug>

The Gemini cache in lib/covers/gemini/client.ts (sha1 of prompt+model)
makes resumes and retries free — only new prompts incur API charges.

Required env vars (loaded from .env via python-dotenv if available):
    GEMINI_API_KEY
    SUPABASE_URL  (or NEXT_PUBLIC_SUPABASE_URL)
    SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any

import yaml

# Load .env if present (so the script can be run directly with `python -m`)
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

PROJECT_ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = PROJECT_ROOT / "blog" / "content" / "posts"
COVER_CLI = PROJECT_ROOT / "lib" / "covers" / "cli.ts"

# Pipeline imports — these run at module level so a missing dep fails fast.
sys.path.insert(0, str(PROJECT_ROOT))
from pipeline.utils.cover_prompt import build_cover_prompt  # noqa: E402
from pipeline.graphics.uploader import upload_to_supabase  # noqa: E402

# Per-content-type category labels for the cover frame
CATEGORY_LABELS = {
    "news_analysis":      "NEWS ANALYSIS",
    "industry_briefing":  "INDUSTRY BRIEFING",
    "deep_dive":          "DEEP DIVE",
    "case_study":         "CASE STUDY",
    "how_to":             "HOW-TO",
    "technology_profile": "TECHNOLOGY PROFILE",
}


def split_frontmatter(text: str) -> tuple[str, str, str]:
    """Return (leading, frontmatter_yaml, body) for a markdown file.

    Expects the file to start with `---\n`. Raises ValueError otherwise.
    """
    if not text.startswith("---"):
        raise ValueError("file does not start with frontmatter delimiter")
    parts = text.split("---", 2)
    if len(parts) < 3:
        raise ValueError("malformed frontmatter — missing closing delimiter")
    return parts[0], parts[1], parts[2]


def distill_hook(title: str) -> str:
    """Same logic as run.py — text after the last colon, fallback to full title."""
    title = (title or "").strip()
    if ":" in title:
        tail = title.split(":")[-1].strip()
        if tail:
            return tail
    return title


def article_date_from_frontmatter(fm: dict[str, Any], filepath: Path) -> str:
    """Extract a YYYY-MM-DD date for the cover frame.

    Falls back to the date in the filename (e.g. 2026-04-07-...).
    """
    raw = fm.get("date")
    if isinstance(raw, str):
        # YYYY-MM-DDTHH... or YYYY-MM-DD
        return raw[:10]
    # Fallback: filename starts with YYYY-MM-DD-
    m = re.match(r"^(\d{4}-\d{2}-\d{2})", filepath.name)
    if m:
        return m.group(1)
    return ""


def build_mode_e_config(fm: dict[str, Any], filepath: Path) -> dict[str, Any]:
    """Construct the cover CLI config from an article's frontmatter."""
    title = (fm.get("title") or filepath.stem).strip()
    slug = (fm.get("slug") or filepath.stem).strip()
    content_type = (fm.get("content_type") or "news_analysis").strip()
    categories = fm.get("categories") or []
    primary_category = categories[0] if isinstance(categories, list) and categories else ""
    category_label = CATEGORY_LABELS.get(content_type, "NEWS ANALYSIS")
    date_str = article_date_from_frontmatter(fm, filepath)

    return {
        "title": title,
        "slug": slug,
        "category": category_label,
        "date": date_str,
        "coverMode": "background-image",
        "hookText": distill_hook(title),
        "geminiPrompt": build_cover_prompt(title, content_type, primary_category),
    }


def run_cover_cli(config: dict[str, Any], slug: str) -> tuple[bool, list[str], int, float, str]:
    """Shell out to the TS cover CLI. Returns (ok, paths, gem_imgs, gem_cost, error)."""
    tmp_dir = Path(tempfile.gettempdir())
    cfg_path = tmp_dir / f"cover-config-backfill-{slug}.json"
    cfg_path.write_text(json.dumps(config), encoding="utf-8")

    proc = subprocess.run(
        [
            "npx", "tsx", str(COVER_CLI),
            "--config", str(cfg_path),
            "--output", str(tmp_dir),
        ],
        capture_output=True, text=True, timeout=240,
        cwd=str(PROJECT_ROOT),
        shell=(os.name == "nt"),
    )

    # Try to parse a JSON success line from stdout regardless of exit code.
    # On Windows, Node sometimes hits a libuv assertion during shutdown
    # (`UV_HANDLE_CLOSING`) AFTER the CLI has already printed its result
    # JSON and written the PNG to disk. The work succeeded; only the
    # process cleanup crashed. We salvage these runs by checking stdout
    # before treating a non-zero exit as fatal.
    parsed = None
    stdout = (proc.stdout or "").strip()
    if stdout:
        try:
            parsed = json.loads(stdout.splitlines()[-1])
        except Exception:
            parsed = None

    if parsed and isinstance(parsed.get("paths"), list) and parsed["paths"]:
        result = parsed
        if proc.returncode != 0:
            # Salvaged a Node-cleanup-crash-after-success
            print(f"  [GRAPHICS] (Node cleanup crashed but image was generated)")
    elif proc.returncode != 0:
        err_tail = (proc.stderr or "").strip().splitlines()[-1] if proc.stderr else ""
        return (False, [], 0, 0.0, err_tail[:240])
    else:
        return (False, [], 0, 0.0, "stdout had no parseable JSON")

    paths = result.get("paths", []) or []
    gem = result.get("geminiUsage") or {}
    return (
        True,
        paths,
        int(gem.get("imageCount", 0) or 0),
        float(gem.get("estimatedCostUsd", 0.0) or 0.0),
        "",
    )


def update_frontmatter_in_place(
    filepath: Path,
    category_label: str,
    title: str,
    cover_url: str,
) -> None:
    """Re-serialize the article frontmatter with new cover metadata.

    Updates:
      - cover.alt          → "{Category Label}: {Title}"
      - cover.generation   → "gemini-v1"
      - top-level image    → cover_url (kept in sync for OG-image consistency)

    Deliberately does NOT set credit_source / image_credit_source. The
    ImageCredit component renders nothing when both photographer and
    source are empty, so AI-generated covers show no credit line.

    Preserves all other frontmatter fields. Body is untouched.
    """
    text = filepath.read_text(encoding="utf-8")
    leading, fm_text, body = split_frontmatter(text)

    fm = yaml.safe_load(fm_text) or {}
    if not isinstance(fm, dict):
        raise ValueError("frontmatter is not a mapping")

    cover = fm.get("cover")
    if not isinstance(cover, dict):
        cover = {}
    cover["image"] = cover_url
    cover["alt"] = f"{category_label}: {title}"
    cover["generation"] = "gemini-v1"
    # Scrub any legacy "ai-generated" credits from the cover block
    for stale in ("credit_name", "credit_url", "credit_source"):
        cover.pop(stale, None)
    fm["cover"] = cover

    fm["image"] = cover_url
    fm["image_alt"] = f"{category_label}: {title}"
    # Scrub any legacy "ai-generated" top-level credit fields
    for stale in ("image_credit_name", "image_credit_url", "image_credit_source"):
        fm.pop(stale, None)

    new_fm = yaml.safe_dump(
        fm, sort_keys=False, allow_unicode=True, width=4096, default_flow_style=False,
    )
    filepath.write_text(
        f"{leading}---\n{new_fm}---{body}",
        encoding="utf-8",
    )


def process_article(
    filepath: Path,
    *,
    dry_run: bool,
    force: bool,
    index: int,
    total: int,
) -> dict[str, Any]:
    """Process one article. Returns a result record for the summary."""
    text = filepath.read_text(encoding="utf-8")
    try:
        _, fm_text, _ = split_frontmatter(text)
    except ValueError as e:
        return {"file": filepath.name, "status": "error", "reason": str(e)}

    fm = yaml.safe_load(fm_text) or {}
    if not isinstance(fm, dict):
        return {"file": filepath.name, "status": "error", "reason": "frontmatter not a mapping"}

    slug = (fm.get("slug") or filepath.stem).strip()
    title = (fm.get("title") or "(untitled)").strip()
    cover = fm.get("cover") or {}
    if not isinstance(cover, dict):
        cover = {}

    # Idempotency: skip if already migrated
    if not force and cover.get("generation") == "gemini-v1":
        print(f"  [{index}/{total}] {slug:50.50}  SKIP (already gemini-v1)")
        return {"slug": slug, "status": "skipped", "cost": 0.0}

    config = build_mode_e_config(fm, filepath)
    category_label = config["category"]

    if dry_run:
        print(f"  [{index}/{total}] {slug:50.50}  DRY-RUN")
        print(f"      title:    {title[:80]}")
        print(f"      category: {category_label}")
        print(f"      hook:     {config['hookText'][:80]}")
        print(f"      prompt:   {config['geminiPrompt'][:140]}...")
        return {"slug": slug, "status": "dry-run", "cost": 0.0}

    ok, paths, gem_imgs, gem_cost, err = run_cover_cli(config, slug)
    if not ok:
        print(f"  [{index}/{total}] {slug:50.50}  FAIL  {err}")
        return {"slug": slug, "status": "failed", "reason": err, "cost": 0.0}

    cover_path = paths[0]
    cover_url = upload_to_supabase(
        cover_path, "covers", f"{slug}.png",
    )
    if not cover_url:
        print(f"  [{index}/{total}] {slug:50.50}  UPLOAD FAILED")
        return {"slug": slug, "status": "upload-failed", "cost": gem_cost}

    try:
        update_frontmatter_in_place(filepath, category_label, title, cover_url)
    except Exception as e:
        print(f"  [{index}/{total}] {slug:50.50}  FRONTMATTER FAILED ({e})")
        return {"slug": slug, "status": "frontmatter-failed", "reason": str(e), "cost": gem_cost}

    cache_indicator = "$0.000 (cache)" if gem_imgs == 0 else f"${gem_cost:.4f}"
    print(f"  [{index}/{total}] {slug:50.50}  OK    {cache_indicator}")
    return {"slug": slug, "status": "ok", "cost": gem_cost, "cache_hit": gem_imgs == 0}


def main():
    parser = argparse.ArgumentParser(
        description="Backfill all published articles with new Mode E covers (Gemini + branded tint).",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print actions without writing files or calling API")
    parser.add_argument("--slug", type=str, default=None, help="Process only articles whose filename matches this substring")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N articles")
    parser.add_argument("--start-from", type=str, default=None, help="Resume from this slug substring (inclusive)")
    parser.add_argument("--force", action="store_true", help="Re-process articles already marked gemini-v1")
    args = parser.parse_args()

    if not POSTS_DIR.exists():
        print(f"ERROR: posts directory not found: {POSTS_DIR}")
        sys.exit(1)
    if not COVER_CLI.exists():
        print(f"ERROR: cover CLI not found at {COVER_CLI}")
        sys.exit(1)

    posts = sorted(POSTS_DIR.glob("*.md"))
    if args.slug:
        posts = [p for p in posts if args.slug in p.name]
    if args.start_from:
        keep = False
        filtered = []
        for p in posts:
            if not keep and args.start_from in p.name:
                keep = True
            if keep:
                filtered.append(p)
        posts = filtered
    if args.limit is not None:
        posts = posts[: args.limit]

    if not posts:
        print("No articles match the filter.")
        return

    print(f"\n{'='*70}")
    print(f"  COVER BACKFILL{'  (DRY RUN)' if args.dry_run else ''}")
    print(f"  Processing {len(posts)} article(s)")
    print(f"{'='*70}\n")

    results: list[dict[str, Any]] = []
    for i, post in enumerate(posts, start=1):
        try:
            r = process_article(
                post,
                dry_run=args.dry_run,
                force=args.force,
                index=i,
                total=len(posts),
            )
        except Exception as e:
            print(f"  [{i}/{len(posts)}] {post.name:50.50}  EXCEPTION  {e}")
            r = {"slug": post.name, "status": "exception", "reason": str(e), "cost": 0.0}
        results.append(r)

    # Summary
    total_cost = sum((r.get("cost") or 0.0) for r in results)
    by_status: dict[str, int] = {}
    for r in results:
        s = r.get("status", "unknown")
        by_status[s] = by_status.get(s, 0) + 1

    print(f"\n{'-'*70}")
    print(f"  Total articles : {len(results)}")
    for s, c in sorted(by_status.items()):
        print(f"  {s:18s} : {c}")
    print(f"  Total Gemini   : ${total_cost:.4f}")
    print(f"{'-'*70}\n")

    failed = [r for r in results if r.get("status") not in ("ok", "skipped", "dry-run")]
    if failed:
        print("Failures:")
        for r in failed:
            print(f"  - {r.get('slug')}  ({r.get('status')}: {r.get('reason', '')})")
        sys.exit(2)


if __name__ == "__main__":
    main()
