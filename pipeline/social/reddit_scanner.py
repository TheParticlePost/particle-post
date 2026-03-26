"""Monitors target subreddits for conversations matching our content.

Uses PRAW to fetch recent posts, filters by age/score/type, and checks
we haven't already replied. Returns candidate threads for scoring.
"""

import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import praw

_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "social_config.json"
_HISTORY_PATH = Path(__file__).resolve().parent / "data" / "posted_history.json"


def _load_config() -> dict:
    return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))


def _get_reddit() -> praw.Reddit:
    """Create an authenticated Reddit instance from environment variables."""
    return praw.Reddit(
        client_id=os.environ["REDDIT_CLIENT_ID"],
        client_secret=os.environ["REDDIT_CLIENT_SECRET"],
        username=os.environ["REDDIT_USERNAME"],
        password=os.environ["REDDIT_PASSWORD"],
        user_agent=os.environ.get("REDDIT_USER_AGENT", "ParticlePost/1.0"),
    )


def _load_replied_threads() -> set[str]:
    """Load set of thread IDs we've already replied to or posted."""
    if not _HISTORY_PATH.exists():
        return set()
    try:
        data = json.loads(_HISTORY_PATH.read_text(encoding="utf-8"))
        return {entry.get("thread_id", "") for entry in data.get("entries", [])}
    except Exception:
        return set()


def _matches_question_pattern(title: str, body: str) -> bool:
    """Check if post looks like a question, recommendation request, or discussion."""
    text = (title + " " + body).lower()
    patterns = [
        "how do i", "how to", "what is the best", "recommendations",
        "looking for", "any suggestions", "which tool", "comparison",
        "vs ", "versus", "help me", "advice", "thoughts on",
        "experience with", "anyone use", "what do you think",
        "?",  # Any question mark in title
    ]
    return any(p in text for p in patterns)


def scan_subreddits(limit_per_sub: int = 25) -> list[dict]:
    """Scan target subreddits and return candidate threads.

    Returns list of dicts with: thread_id, title, body, subreddit, url,
    score, age_hours, comment_count, created_utc.
    """
    config = _load_config()
    reddit = _get_reddit()
    filters = config["thread_filters"]
    replied = _load_replied_threads()

    min_upvotes = filters["min_upvotes"]
    min_age_min = filters["min_age_minutes"]
    max_age_hrs = filters["max_age_hours"]
    fresh_exception_hrs = filters["fresh_exception_hours"]
    skip_flairs = {f.lower() for f in filters.get("skip_flairs", [])}

    now = time.time()
    candidates = []

    for sub_name in config["subreddits"]:
        try:
            subreddit = reddit.subreddit(sub_name)
            # Combine hot and new for broader coverage
            seen_ids = set()
            submissions = []
            for submission in subreddit.hot(limit=limit_per_sub):
                if submission.id not in seen_ids:
                    seen_ids.add(submission.id)
                    submissions.append(submission)
            for submission in subreddit.new(limit=limit_per_sub):
                if submission.id not in seen_ids:
                    seen_ids.add(submission.id)
                    submissions.append(submission)

            for submission in submissions:
                age_hours = (now - submission.created_utc) / 3600
                age_minutes = age_hours * 60

                # Skip if too old
                if age_hours > max_age_hrs:
                    continue

                # Skip if too young (let organic discussion start)
                if age_minutes < min_age_min:
                    continue

                # Skip if already replied
                if submission.id in replied:
                    continue

                # Skip image/video posts
                if submission.is_video or (
                    hasattr(submission, "post_hint")
                    and submission.post_hint in ("image", "hosted:video", "rich:video")
                ):
                    continue

                # Skip excluded flairs
                flair = (submission.link_flair_text or "").lower()
                if flair in skip_flairs:
                    continue

                # Upvote filter (with exception for fresh posts)
                if submission.score < min_upvotes and age_hours >= fresh_exception_hrs:
                    continue

                # Prefer question/discussion posts
                title = submission.title or ""
                body = submission.selftext or ""
                if not _matches_question_pattern(title, body):
                    continue

                candidates.append({
                    "thread_id": submission.id,
                    "title": title,
                    "body": body[:2000],  # truncate long posts
                    "subreddit": sub_name,
                    "url": f"https://reddit.com{submission.permalink}",
                    "score": submission.score,
                    "age_hours": round(age_hours, 1),
                    "comment_count": submission.num_comments,
                    "created_utc": submission.created_utc,
                })

        except Exception as e:
            print(f"  Warning: error scanning r/{sub_name}: {e}")
            continue

    # Sort by score descending (most popular first)
    candidates.sort(key=lambda x: x["score"], reverse=True)
    return candidates
