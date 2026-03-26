"""Creates original Reddit posts by repurposing blog articles.

Picks articles not shared recently, rewrites them as Reddit-native content
(discussion starters, mini-guides, lessons-learned), and queues for approval.
"""

import json
import os
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pipeline.social.article_index import load_index

_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "social_config.json"
_HISTORY_PATH = Path(__file__).resolve().parent / "data" / "posted_history.json"

POST_CREATION_PROMPT = """You are a knowledgeable Reddit user who shares insights from your expertise in AI, business, and finance.

Create a Reddit post based on the article below. The post must be REDDIT-NATIVE — not a blog link dump.

═══ FORMAT OPTIONS (pick the best fit) ═══
1. Discussion starter: Share a key finding and ask the community their experience
2. Mini-guide: Distill the article into 5-7 actionable bullet points
3. Lessons-learned: Frame it as "what we found after researching X"

═══ RULES ═══
- Write 200-400 words of genuinely useful content
- Sound like a person sharing knowledge, not a brand promoting content
- Include the article link ONLY at the very end: "Full write-up here: [URL]"
- Do NOT start with "Hey everyone!" or "I just published..."
- DO start with a hook: a surprising stat, a contrarian take, or a specific problem

═══ OUTPUT FORMAT ═══
Return JSON with exactly these fields:
{"title": "Post title (engaging, not clickbait)", "body": "Post body text", "best_subreddit": "subreddit_name"}"""


def _load_config() -> dict:
    return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))


def _posts_this_week() -> int:
    """Count original posts made this week."""
    if not _HISTORY_PATH.exists():
        return 0
    try:
        data = json.loads(_HISTORY_PATH.read_text(encoding="utf-8"))
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        return sum(
            1 for e in data.get("entries", [])
            if e.get("type") == "original_post" and e.get("posted_at", "") > week_ago
        )
    except Exception:
        return 0


def _pick_article() -> dict | None:
    """Pick an article that hasn't been shared recently."""
    articles = load_index()
    # Sort by: never shared first, then least recently shared
    candidates = sorted(
        articles,
        key=lambda a: (a.get("times_shared", 0), a.get("last_shared_date") or ""),
    )
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    for article in candidates:
        last = article.get("last_shared_date")
        if not last or last < week_ago:
            return article
    return None


def create_post() -> dict | None:
    """Create an original Reddit post from an unshared article."""
    config = _load_config()
    max_per_week = config["rate_limits"]["max_original_posts_per_week"]

    if _posts_this_week() >= max_per_week:
        print(f"  Skipping: already posted {max_per_week} original posts this week")
        return None

    article = _pick_article()
    if not article:
        print("  No suitable article found for original post")
        return None

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None

    utm = f"?utm_source={config['utm_source']}&utm_medium=post&utm_campaign=original"
    article_url = article["url"] + utm

    user_prompt = (
        f"ARTICLE TO REPURPOSE:\n"
        f"Title: {article['title']}\n"
        f"Summary: {article.get('summary', '')}\n"
        f"Tags: {', '.join(article.get('tags', []))}\n"
        f"Keywords: {', '.join(article.get('keywords', []))}\n"
        f"Article URL: {article_url}\n\n"
        f"TARGET SUBREDDITS (pick the best one): {', '.join(config['subreddits'])}"
    )

    body = json.dumps({
        "model": "claude-sonnet-4-6",
        "max_tokens": 1000,
        "system": POST_CREATION_PROMPT,
        "messages": [{"role": "user", "content": user_prompt}],
    }).encode("utf-8")

    req = Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
        text = result.get("content", [{}])[0].get("text", "").strip()
        text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        post_data = json.loads(text)
    except (HTTPError, URLError, json.JSONDecodeError) as e:
        print(f"  Warning: post creation failed: {e}")
        return None

    return {
        "type": "original_post",
        "subreddit": post_data.get("best_subreddit", config["subreddits"][0]),
        "post_title": post_data.get("title", ""),
        "post_body": post_data.get("body", ""),
        "article_slug": article["slug"],
        "article_url": article_url,
        "has_link": True,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
