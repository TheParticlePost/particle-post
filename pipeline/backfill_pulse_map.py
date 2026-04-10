"""
Backfill: scan every case_study article in blog/content/posts/ and
ensure it has a corresponding row in the Supabase pulse_case_studies
table so it appears on the AI Pulse map.

For each article:
  1. Parse frontmatter (pyyaml)
  2. Skip if content_type != case_study
  3. Query Supabase for an existing row by slug
  4. If missing, call publish_case_study_to_pulse() to insert it
  5. Report success/failure per article + summary

Usage:
    python -m pipeline.backfill_pulse_map                  # full backfill
    python -m pipeline.backfill_pulse_map --dry-run        # preview only
    python -m pipeline.backfill_pulse_map --slug kodiak    # single slug filter
    python -m pipeline.backfill_pulse_map --force          # re-insert even if row exists

Required env vars (loaded from .env via python-dotenv if available):
    SUPABASE_URL  (or NEXT_PUBLIC_SUPABASE_URL)
    SUPABASE_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

import yaml

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

PROJECT_ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = PROJECT_ROOT / "blog" / "content" / "posts"

sys.path.insert(0, str(PROJECT_ROOT))
from pipeline.utils.case_study_publisher import publish_case_study_to_pulse  # noqa: E402


def split_frontmatter(text: str) -> tuple[str, str, str]:
    if not text.startswith("---"):
        raise ValueError("file does not start with frontmatter delimiter")
    parts = text.split("---", 2)
    if len(parts) < 3:
        raise ValueError("malformed frontmatter — missing closing delimiter")
    return parts[0], parts[1], parts[2]


def row_exists(url: str, key: str, slug: str) -> bool:
    api = f"{url}/rest/v1/pulse_case_studies?slug=eq.{slug}&select=id"
    req = urllib.request.Request(
        api,
        headers={"Authorization": f"Bearer {key}", "apikey": key},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status != 200:
                return False
            rows = json.loads(resp.read().decode("utf-8"))
            return isinstance(rows, list) and len(rows) > 0
    except Exception:
        return False


def delete_row(url: str, key: str, slug: str) -> bool:
    api = f"{url}/rest/v1/pulse_case_studies?slug=eq.{slug}"
    req = urllib.request.Request(
        api,
        method="DELETE",
        headers={
            "Authorization": f"Bearer {key}",
            "apikey": key,
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status in (200, 204)
    except Exception:
        return False


def process_article(
    filepath: Path,
    *,
    dry_run: bool,
    force: bool,
    url: str,
    key: str,
    index: int,
    total: int,
    verbose: bool = True,
) -> dict[str, Any]:
    def _log(msg: str) -> None:
        if verbose:
            print(msg)

    text = filepath.read_text(encoding="utf-8")
    try:
        _, fm_text, body = split_frontmatter(text)
    except ValueError as e:
        return {"file": filepath.name, "status": "error", "reason": str(e)}

    fm = yaml.safe_load(fm_text) or {}
    if not isinstance(fm, dict):
        return {"file": filepath.name, "status": "error", "reason": "frontmatter not a mapping"}

    content_type = (fm.get("content_type") or "").strip()
    if content_type != "case_study":
        return {"slug": fm.get("slug", filepath.stem), "status": "not-case-study"}

    slug = (fm.get("slug") or filepath.stem).strip()
    title = (fm.get("title") or "(untitled)").strip()

    already = row_exists(url, key, slug)
    if already and not force:
        _log(f"  [{index}/{total}] {slug:55.55}  SKIP (already in map)")
        return {"slug": slug, "status": "skipped"}

    if dry_run:
        _log(f"  [{index}/{total}] {slug:55.55}  DRY-RUN title={title[:60]}")
        return {"slug": slug, "status": "dry-run"}

    if already and force:
        if delete_row(url, key, slug):
            _log(f"  [{index}/{total}] {slug:55.55}  (force: deleted existing row)")
        else:
            _log(f"  [{index}/{total}] {slug:55.55}  WARN: force delete failed, insert may conflict")

    # publish_case_study_to_pulse expects the FULL article content (frontmatter + body)
    # so it can extract additional fields via regex.
    seo_data = {
        "meta_title": fm.get("title", ""),
        "meta_description": fm.get("description", ""),
        "categories": fm.get("categories") or [],
        "tags": fm.get("tags") or [],
        "slug": slug,
    }

    try:
        publish_case_study_to_pulse(text, seo_data, slug)
    except Exception as e:
        _log(f"  [{index}/{total}] {slug:55.55}  EXCEPTION  {e}")
        return {"slug": slug, "status": "exception", "reason": str(e)}

    # Verify it actually landed
    if row_exists(url, key, slug):
        _log(f"  [{index}/{total}] {slug:55.55}  OK")
        return {"slug": slug, "status": "ok"}
    else:
        _log(f"  [{index}/{total}] {slug:55.55}  FAILED (row not found after insert)")
        return {"slug": slug, "status": "failed"}


def sync_pulse_map(
    *,
    dry_run: bool = False,
    slug_filter: str | None = None,
    force: bool = False,
    verbose: bool = False,
) -> dict[str, Any]:
    """Self-heal: ensure every case_study article has a row in pulse_case_studies.

    Designed to be called from pipeline/run.py at the end of every pipeline
    run AND from pipeline/content_audit_run.py as part of the weekly audit.
    Cheap (one GET per case_study article) and idempotent — safe to call
    on every run.

    Returns:
        {
            "scanned": int,
            "skipped": int,        # already in map (the common case)
            "inserted": int,       # newly inserted this call
            "inserted_slugs": list[str],
            "failed": int,
            "failed_slugs": list[str],
            "enabled": bool,       # false if SUPABASE env vars missing
        }
    """
    result = {
        "scanned": 0, "skipped": 0, "inserted": 0,
        "inserted_slugs": [], "failed": 0, "failed_slugs": [],
        "enabled": False,
    }

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        return result  # enabled=False, caller decides whether to warn
    result["enabled"] = True

    if not POSTS_DIR.exists():
        return result

    posts = sorted(POSTS_DIR.glob("*.md"))
    if slug_filter:
        posts = [p for p in posts if slug_filter in p.name]

    for i, post in enumerate(posts, start=1):
        try:
            r = process_article(
                post,
                dry_run=dry_run,
                force=force,
                url=url, key=key,
                index=i, total=len(posts),
                verbose=verbose,
            )
        except Exception as e:
            result["failed"] += 1
            result["failed_slugs"].append(post.stem)
            if verbose:
                print(f"  [{i}/{len(posts)}] {post.name}  EXCEPTION  {e}")
            continue

        status = r.get("status", "")
        if status == "not-case-study":
            continue
        result["scanned"] += 1
        if status == "skipped":
            result["skipped"] += 1
        elif status == "ok":
            result["inserted"] += 1
            result["inserted_slugs"].append(r.get("slug", ""))
        elif status == "dry-run":
            # Count dry-run as "would insert" so callers can report it
            result["inserted"] += 1
            result["inserted_slugs"].append(r.get("slug", ""))
        elif status in ("failed", "exception", "error"):
            result["failed"] += 1
            result["failed_slugs"].append(r.get("slug", ""))

    return result


def main():
    """CLI entry point. For programmatic use call sync_pulse_map() directly."""
    parser = argparse.ArgumentParser(
        description="Backfill Supabase pulse_case_studies from blog/content/posts/ case_study articles.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print actions without inserting")
    parser.add_argument("--slug", type=str, default=None, help="Only process articles whose filename contains this substring")
    parser.add_argument("--force", action="store_true", help="Delete + re-insert even if a row already exists")
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from env")
        sys.exit(1)

    if not POSTS_DIR.exists():
        print(f"ERROR: posts directory not found: {POSTS_DIR}")
        sys.exit(1)

    posts = sorted(POSTS_DIR.glob("*.md"))
    if args.slug:
        posts = [p for p in posts if args.slug in p.name]
    if not posts:
        print("No articles match the filter.")
        return

    print(f"\n{'='*70}")
    print(f"  PULSE MAP BACKFILL{'  (DRY RUN)' if args.dry_run else ''}")
    print(f"  Scanning {len(posts)} article(s)")
    print(f"{'='*70}\n")

    results: list[dict[str, Any]] = []
    for i, post in enumerate(posts, start=1):
        r = process_article(
            post,
            dry_run=args.dry_run,
            force=args.force,
            url=url, key=key,
            index=i, total=len(posts),
        )
        results.append(r)

    # Summary
    case_study_results = [r for r in results if r.get("status") != "not-case-study"]
    by_status: dict[str, int] = {}
    for r in case_study_results:
        s = r.get("status", "unknown")
        by_status[s] = by_status.get(s, 0) + 1

    print(f"\n{'-'*70}")
    print(f"  Case study articles scanned : {len(case_study_results)}")
    for s, c in sorted(by_status.items()):
        print(f"  {s:20s} : {c}")
    print(f"{'-'*70}\n")

    failed = [r for r in case_study_results if r.get("status") not in ("ok", "skipped", "dry-run")]
    if failed:
        print("Failures:")
        for r in failed:
            print(f"  - {r.get('slug')}  ({r.get('status')}: {r.get('reason', '')})")
        sys.exit(2)


if __name__ == "__main__":
    main()
