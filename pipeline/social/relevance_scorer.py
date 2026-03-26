"""Scores Reddit threads for relevance to our articles using Claude Haiku.

For each candidate thread, returns: relevance (1-10), helpfulness (1-10),
link_appropriate (bool), best_article_slug, and reasoning.
"""

import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pipeline.social.article_index import get_compact_index

_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "social_config.json"

SCORING_SYSTEM_PROMPT = """You are a content relevance scorer for Particle Post, a publication covering AI in Business and Finance.

Given a Reddit thread and our article catalog, score the thread on:
1. relevance (1-10): How closely does this thread match one of our articles?
2. helpfulness (1-10): Can we genuinely help this person with knowledge from our articles?
3. link_appropriate (true/false): Would sharing our article link feel natural and helpful, or spammy?
4. best_article_slug: Which article from our catalog best matches this thread?
5. reasoning: One sentence explaining your scoring.

Respond with ONLY valid JSON, no markdown fences:
{"relevance": N, "helpfulness": N, "link_appropriate": BOOL, "best_article_slug": "slug-here", "reasoning": "..."}

If no article is relevant, set relevance to 1 and best_article_slug to null."""


def _load_config() -> dict:
    return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))


def score_thread(thread: dict) -> dict | None:
    """Score a single thread against our article index.

    Returns the thread dict enriched with scoring fields, or None if below thresholds.
    """
    config = _load_config()
    thresholds = config["scoring_thresholds"]
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None

    article_catalog = get_compact_index()

    user_prompt = (
        f"REDDIT THREAD from r/{thread['subreddit']}:\n"
        f"Title: {thread['title']}\n"
        f"Body: {thread['body'][:1000]}\n"
        f"Score: {thread['score']} upvotes | {thread['comment_count']} comments\n\n"
        f"OUR ARTICLE CATALOG:\n{article_catalog}"
    )

    body = json.dumps({
        "model": "claude-haiku-4-5-20251001",
        "max_tokens": 300,
        "system": SCORING_SYSTEM_PROMPT,
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
        with urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
        text = result.get("content", [{}])[0].get("text", "")
        # Parse JSON from response (handle markdown fences)
        text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        scoring = json.loads(text)
    except (HTTPError, URLError, json.JSONDecodeError, KeyError, IndexError) as e:
        print(f"  Warning: scoring failed for {thread['thread_id']}: {e}")
        return None

    relevance = scoring.get("relevance", 0)
    helpfulness = scoring.get("helpfulness", 0)

    if relevance < thresholds["min_relevance"] or helpfulness < thresholds["min_helpfulness"]:
        return None

    # Enrich thread with scoring
    thread["relevance"] = relevance
    thread["helpfulness"] = helpfulness
    thread["link_appropriate"] = scoring.get("link_appropriate", False)
    thread["best_article_slug"] = scoring.get("best_article_slug")
    thread["scoring_reasoning"] = scoring.get("reasoning", "")
    return thread


def score_threads(threads: list[dict]) -> list[dict]:
    """Score multiple threads. Returns only those passing thresholds."""
    scored = []
    for i, thread in enumerate(threads):
        print(f"  Scoring {i+1}/{len(threads)}: r/{thread['subreddit']} — {thread['title'][:50]}...")
        result = score_thread(thread)
        if result:
            scored.append(result)
    scored.sort(key=lambda x: x["relevance"] + x["helpfulness"], reverse=True)
    return scored
