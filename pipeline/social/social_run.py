"""CLI entry point for the Particle Post Social Media Automation Agent.

Usage:
    python -m pipeline.social.social_run scan      # Scan → score → draft → queue
    python -m pipeline.social.social_run review     # Interactive approval review
    python -m pipeline.social.social_run post       # Post approved items
    python -m pipeline.social.social_run full       # scan + review + post
    python -m pipeline.social.social_run index      # Rebuild article index
    python -m pipeline.social.social_run stats      # Show analytics dashboard
"""

import argparse
import sys
from pathlib import Path

# Ensure project root is on sys.path
_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dotenv import load_dotenv
load_dotenv(_ROOT / ".env")


def cmd_index():
    """Rebuild the article index."""
    from pipeline.social.article_index import build_index
    print("\n  Building article index...")
    articles = build_index()
    print(f"  Done: {len(articles)} articles indexed\n")
    for a in articles[:5]:
        print(f"    {a['date']} | {a['title'][:55]} | {len(a['keywords'])} kw | shared {a['times_shared']}x")
    if len(articles) > 5:
        print(f"    ... and {len(articles) - 5} more")


def cmd_scan():
    """Scan subreddits, score threads, draft replies, add to queue."""
    from pipeline.social.article_index import load_index
    from pipeline.social.reddit_scanner import scan_subreddits
    from pipeline.social.relevance_scorer import score_threads
    from pipeline.social.reply_drafter import draft_replies
    from pipeline.social.post_creator import create_post
    from pipeline.social.approval_queue import add_to_queue

    # Ensure index exists
    index = load_index()
    if not index:
        print("  No articles indexed. Run 'index' first.")
        return

    print(f"\n  Article index: {len(index)} articles")

    # Scan subreddits
    print("\n  Scanning subreddits...")
    candidates = scan_subreddits()
    print(f"  Found {len(candidates)} candidate threads")

    if not candidates:
        print("  No candidates found matching filters.")
    else:
        # Score with Claude Haiku
        print(f"\n  Scoring {len(candidates)} threads with Claude Haiku...")
        scored = score_threads(candidates)
        print(f"  {len(scored)} threads passed scoring thresholds")

        if scored:
            # Draft replies with Claude Sonnet
            print(f"\n  Drafting replies with Claude Sonnet...")
            drafts = draft_replies(scored)
            print(f"  {len(drafts)} replies drafted")

            if drafts:
                added = add_to_queue(drafts)
                print(f"  {added} new items added to approval queue")

    # Also try to create an original post
    print("\n  Checking for original post opportunity...")
    original = create_post()
    if original:
        added = add_to_queue([original])
        print(f"  Original post drafted and queued")

    # Show queue summary
    from pipeline.social.approval_queue import get_pending
    pending = get_pending()
    print(f"\n  Queue: {len(pending)} items pending review")
    print("  Run 'review' to approve/reject items\n")


def cmd_review():
    """Interactive approval review."""
    from pipeline.social.approval_queue import review_interactive
    review_interactive()


def cmd_post():
    """Post approved items to Reddit."""
    from pipeline.social.reddit_poster import post_approved
    print("\n  Posting approved items...")
    post_approved()


def cmd_full():
    """Full cycle: scan + review + post."""
    cmd_scan()
    cmd_review()

    from pipeline.social.approval_queue import get_approved
    approved = get_approved()
    if approved:
        print(f"\n  {len(approved)} approved items ready to post.")
        choice = input("  Post now? [y/N]: ").strip().lower()
        if choice == "y":
            cmd_post()
    else:
        print("\n  No approved items to post.")


def cmd_stats():
    """Show analytics dashboard."""
    from pipeline.social.analytics import show_stats, update_upvotes
    print("\n  Updating upvote counts...")
    try:
        update_upvotes()
    except Exception as e:
        print(f"  (Skipped upvote update: {e})")
    show_stats()


def main():
    parser = argparse.ArgumentParser(
        prog="social_run",
        description="Particle Post Social Media Automation Agent",
    )
    parser.add_argument(
        "command",
        choices=["scan", "review", "post", "full", "index", "stats"],
        help="Command to run",
    )
    args = parser.parse_args()

    commands = {
        "scan": cmd_scan,
        "review": cmd_review,
        "post": cmd_post,
        "full": cmd_full,
        "index": cmd_index,
        "stats": cmd_stats,
    }
    commands[args.command]()


if __name__ == "__main__":
    main()
