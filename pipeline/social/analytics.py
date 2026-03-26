"""Tracks performance of social media activity.

Per-reply: upvotes, article linked, subreddit
Per-article: total shares, subreddits shared to
Daily summary: opportunities found, drafted, posted
"""

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path

_DATA_DIR = Path(__file__).resolve().parent / "data"
_ANALYTICS_PATH = _DATA_DIR / "analytics.json"
_HISTORY_PATH = _DATA_DIR / "posted_history.json"
_QUEUE_PATH = _DATA_DIR / "queue.json"
_INDEX_PATH = _DATA_DIR / "article_index.json"


def _load_json(path: Path) -> dict | list:
    if not path.exists():
        return {} if path.name != "queue.json" else []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {} if path.name != "queue.json" else []


def update_upvotes():
    """Fetch current upvotes for posted comments/posts via PRAW."""
    try:
        import praw
        reddit = praw.Reddit(
            client_id=os.environ["REDDIT_CLIENT_ID"],
            client_secret=os.environ["REDDIT_CLIENT_SECRET"],
            username=os.environ["REDDIT_USERNAME"],
            password=os.environ["REDDIT_PASSWORD"],
            user_agent=os.environ.get("REDDIT_USER_AGENT", "ParticlePost/1.0"),
        )
    except Exception:
        print("  Cannot connect to Reddit for upvote tracking")
        return

    history = _load_json(_HISTORY_PATH)
    entries = history.get("entries", [])
    updated = 0

    for entry in entries:
        try:
            if entry.get("type") == "reply" and entry.get("comment_id"):
                comment = reddit.comment(entry["comment_id"])
                entry["upvotes"] = comment.score
                updated += 1
            elif entry.get("type") == "original_post" and entry.get("thread_id"):
                submission = reddit.submission(id=entry["thread_id"])
                entry["upvotes"] = submission.score
                entry["comments"] = submission.num_comments
                updated += 1
        except Exception:
            continue

    if updated:
        _HISTORY_PATH.write_text(json.dumps(history, indent=2), encoding="utf-8")
    print(f"  Updated upvotes for {updated} entries")


def show_stats():
    """Display analytics dashboard in the terminal."""
    history = _load_json(_HISTORY_PATH)
    queue = _load_json(_QUEUE_PATH)
    index = _load_json(_INDEX_PATH)
    entries = history.get("entries", []) if isinstance(history, dict) else []

    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()

    # Overall stats
    total_replies = sum(1 for e in entries if e.get("type") == "reply")
    total_posts = sum(1 for e in entries if e.get("type") == "original_post")
    total_with_link = sum(1 for e in entries if e.get("has_link"))
    total_upvotes = sum(e.get("upvotes", 0) for e in entries)

    # Today stats
    today_entries = [e for e in entries if e.get("posted_at", "") >= today]
    today_replies = sum(1 for e in today_entries if e.get("type") == "reply")

    # Queue stats
    if isinstance(queue, list):
        pending = sum(1 for q in queue if q.get("status") == "pending")
        approved = sum(1 for q in queue if q.get("status") == "approved")
        rejected = sum(1 for q in queue if q.get("status") == "rejected")
    else:
        pending = approved = rejected = 0

    # Self-promo ratio
    promo_ratio = (total_with_link / len(entries) * 100) if entries else 0

    print("\n" + "=" * 60)
    print("  PARTICLE POST — Social Media Analytics")
    print("=" * 60)

    print(f"\n  OVERALL")
    print(f"  {'Total replies posted:':<30} {total_replies}")
    print(f"  {'Total original posts:':<30} {total_posts}")
    print(f"  {'Total upvotes earned:':<30} {total_upvotes}")
    print(f"  {'Replies with links:':<30} {total_with_link}")
    print(f"  {'Self-promo ratio:':<30} {promo_ratio:.1f}%")

    print(f"\n  TODAY")
    print(f"  {'Replies posted today:':<30} {today_replies}/5")

    print(f"\n  QUEUE")
    print(f"  {'Pending review:':<30} {pending}")
    print(f"  {'Approved (ready to post):':<30} {approved}")
    print(f"  {'Rejected:':<30} {rejected}")

    # Per-subreddit breakdown
    sub_stats = {}
    for e in entries:
        sub = e.get("subreddit", "?")
        if sub not in sub_stats:
            sub_stats[sub] = {"replies": 0, "posts": 0, "upvotes": 0}
        if e.get("type") == "reply":
            sub_stats[sub]["replies"] += 1
        else:
            sub_stats[sub]["posts"] += 1
        sub_stats[sub]["upvotes"] += e.get("upvotes", 0)

    if sub_stats:
        print(f"\n  PER SUBREDDIT")
        print(f"  {'Subreddit':<25} {'Replies':<10} {'Posts':<10} {'Upvotes':<10}")
        print(f"  {'-'*55}")
        for sub, stats in sorted(sub_stats.items(), key=lambda x: x[1]["upvotes"], reverse=True):
            print(f"  r/{sub:<23} {stats['replies']:<10} {stats['posts']:<10} {stats['upvotes']:<10}")

    # Per-article breakdown
    article_stats = {}
    for e in entries:
        slug = e.get("article_slug")
        if slug:
            if slug not in article_stats:
                article_stats[slug] = {"shares": 0, "upvotes": 0}
            article_stats[slug]["shares"] += 1
            article_stats[slug]["upvotes"] += e.get("upvotes", 0)

    if article_stats:
        print(f"\n  TOP ARTICLES (by shares)")
        print(f"  {'Article':<45} {'Shares':<10} {'Upvotes':<10}")
        print(f"  {'-'*65}")
        for slug, stats in sorted(article_stats.items(), key=lambda x: x[1]["shares"], reverse=True)[:10]:
            print(f"  {slug[:43]:<45} {stats['shares']:<10} {stats['upvotes']:<10}")

    print("\n" + "=" * 60)
