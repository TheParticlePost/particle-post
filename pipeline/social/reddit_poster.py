"""Posts approved queue items to Reddit with rate limiting and safety checks.

Enforces: max 5 replies/day, 60min gaps, 10% self-promo ratio.
Logs everything to posted_history.json for analytics and dedup.
"""

import json
import os
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import praw

from pipeline.social.approval_queue import get_approved, _load_queue, _save_queue

_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "social_config.json"
_HISTORY_PATH = Path(__file__).resolve().parent / "data" / "posted_history.json"
_INDEX_PATH = Path(__file__).resolve().parent / "data" / "article_index.json"


def _load_config() -> dict:
    return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))


def _get_reddit() -> praw.Reddit:
    return praw.Reddit(
        client_id=os.environ["REDDIT_CLIENT_ID"],
        client_secret=os.environ["REDDIT_CLIENT_SECRET"],
        username=os.environ["REDDIT_USERNAME"],
        password=os.environ["REDDIT_PASSWORD"],
        user_agent=os.environ.get("REDDIT_USER_AGENT", "ParticlePost/1.0"),
    )


def _load_history() -> dict:
    if not _HISTORY_PATH.exists():
        return {"entries": []}
    try:
        return json.loads(_HISTORY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"entries": []}


def _save_history(history: dict):
    _HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    _HISTORY_PATH.write_text(json.dumps(history, indent=2), encoding="utf-8")


def _check_rate_limits(config: dict, history: dict) -> tuple[bool, str]:
    """Check if we can post. Returns (can_post, reason)."""
    limits = config["rate_limits"]
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0).isoformat()

    entries = history.get("entries", [])
    today_entries = [e for e in entries if e.get("posted_at", "") >= today_start]
    reply_entries = [e for e in today_entries if e.get("type") == "reply"]

    # Max replies per day
    if len(reply_entries) >= limits["max_replies_per_day"]:
        return False, f"Daily reply limit reached ({limits['max_replies_per_day']})"

    # Min minutes between replies
    if reply_entries:
        last_time = max(e.get("posted_at", "") for e in reply_entries)
        last_dt = datetime.fromisoformat(last_time)
        minutes_since = (now - last_dt).total_seconds() / 60
        if minutes_since < limits["min_minutes_between_replies"]:
            wait = int(limits["min_minutes_between_replies"] - minutes_since)
            return False, f"Must wait {wait} more minutes between replies"

    # Self-promo ratio check
    total = len(entries)
    promo = sum(1 for e in entries if e.get("has_link", False))
    if total >= 10:
        ratio = promo / total
        if ratio >= limits["self_promo_ratio_max"]:
            return False, f"Self-promo ratio too high ({ratio:.0%}, max {limits['self_promo_ratio_max']:.0%})"

    return True, "OK"


def _update_article_index(article_slug: str):
    """Increment times_shared and update last_shared_date for an article."""
    if not _INDEX_PATH.exists():
        return
    try:
        index = json.loads(_INDEX_PATH.read_text(encoding="utf-8"))
        for article in index:
            if article.get("slug") == article_slug:
                article["times_shared"] = article.get("times_shared", 0) + 1
                article["last_shared_date"] = datetime.now(timezone.utc).isoformat()
                break
        _INDEX_PATH.write_text(json.dumps(index, indent=2), encoding="utf-8")
    except Exception:
        pass


def post_approved():
    """Post all approved items from the queue, respecting rate limits."""
    config = _load_config()
    history = _load_history()
    approved = get_approved()

    if not approved:
        print("\n  No approved items to post.")
        return

    reddit = _get_reddit()
    posted_count = 0

    for item in approved:
        can_post, reason = _check_rate_limits(config, history)
        if not can_post:
            print(f"  Rate limit: {reason}. Stopping.")
            break

        try:
            if item["type"] == "reply":
                # Post comment on the thread
                submission = reddit.submission(id=item["thread_id"])
                comment = submission.reply(item["draft_text"])
                print(f"  Posted reply to r/{item['subreddit']}: {item['thread_title'][:50]}...")
                entry = {
                    "type": "reply",
                    "thread_id": item["thread_id"],
                    "comment_id": comment.id if comment else None,
                    "subreddit": item["subreddit"],
                    "article_slug": item.get("article_slug"),
                    "has_link": item.get("has_link", False),
                    "posted_at": datetime.now(timezone.utc).isoformat(),
                }

            elif item["type"] == "original_post":
                # Create new post
                subreddit = reddit.subreddit(item["subreddit"])
                submission = subreddit.submit(
                    title=item["post_title"],
                    selftext=item["post_body"],
                )
                print(f"  Posted original to r/{item['subreddit']}: {item['post_title'][:50]}...")
                entry = {
                    "type": "original_post",
                    "thread_id": submission.id if submission else None,
                    "subreddit": item["subreddit"],
                    "article_slug": item.get("article_slug"),
                    "has_link": True,
                    "posted_at": datetime.now(timezone.utc).isoformat(),
                }
            else:
                continue

            # Update history
            history["entries"].append(entry)
            _save_history(history)

            # Update article sharing stats
            if item.get("article_slug"):
                _update_article_index(item["article_slug"])

            # Mark as posted in queue
            queue = _load_queue()
            for q in queue:
                if (q.get("thread_id") == item.get("thread_id")
                        and q.get("type") == item.get("type")
                        and q.get("status") == "approved"):
                    q["status"] = "posted"
                    q["posted_at"] = datetime.now(timezone.utc).isoformat()
                    break
            _save_queue(queue)

            posted_count += 1

        except praw.exceptions.RedditAPIException as e:
            print(f"  Reddit API error: {e}")
            if "RATELIMIT" in str(e).upper():
                print("  Account rate-limited! Stopping immediately.")
                break
        except Exception as e:
            print(f"  Error posting: {e}")
            continue

    print(f"\n  Posted {posted_count} items.")
