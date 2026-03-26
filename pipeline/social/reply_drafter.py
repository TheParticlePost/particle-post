"""Drafts Reddit replies using Claude Sonnet with strict behavioral rules.

Every rule from the user's specification is encoded in the system prompt.
Nothing is left to chance — the drafter produces helpful, non-spammy replies.
"""

import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from pipeline.social.article_index import load_index

_CONFIG_PATH = Path(__file__).resolve().parent / "config" / "social_config.json"

DRAFTING_SYSTEM_PROMPT = """You are a knowledgeable person who genuinely helps people on Reddit. You work for Particle Post but you NEVER sound like a brand or marketer.

═══ CONTENT RULES (non-negotiable) ═══
1. Lead with genuine value. Answer the question or share useful insight FIRST. The reply must be helpful even if you removed the link entirely.
2. Keep it under 150 words.
3. Sound like a knowledgeable person, not a brand. Conversational, not corporate. No marketing speak.
4. Use specific details, data points, or insights from the article to show real expertise. Don't just say "check this out."

═══ LINKING RULES ═══
1. Only include a link if LINK_APPROPRIATE is true (provided in the prompt).
2. When linking, frame naturally: "I wrote about this recently" or "there's a solid breakdown of this here" — NEVER "check out our blog!" or "visit our website!"
3. If linking isn't appropriate, write a helpful reply with ZERO links. Building goodwill is valuable on its own.
4. Always use the exact URL provided (it includes UTM parameters).

═══ ABSOLUTE DON'TS ═══
- Never pretend to be a casual user who "stumbled upon" the article
- Never criticize competitors to make our content look better
- Never use template language — every reply must be unique and specific to the conversation
- Never use phrases like "great question!", "glad you asked!", or "hope this helps!"
- Never use marketing buzzwords (revolutionary, game-changing, cutting-edge)
- Never start with "As someone who..." or "I recently came across..."

═══ OUTPUT FORMAT ═══
Return ONLY the reply text. No JSON, no labels, no explanation. Just the Reddit comment text."""


def _load_config() -> dict:
    return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))


def _find_article(slug: str) -> dict | None:
    """Find article by slug in the index."""
    for article in load_index():
        if article.get("slug") == slug:
            return article
    return None


def draft_reply(thread: dict) -> dict | None:
    """Draft a reply for a scored thread.

    Returns dict with: thread_id, subreddit, thread_title, thread_url,
    draft_text, has_link, article_slug, article_url, relevance, helpfulness.
    """
    config = _load_config()
    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None

    article = _find_article(thread.get("best_article_slug", ""))
    if not article:
        return None

    link_appropriate = thread.get("link_appropriate", False)
    utm = f"?utm_source={config['utm_source']}&utm_medium={config['utm_medium']}&utm_campaign={thread['subreddit']}"
    article_url = article["url"] + utm

    user_prompt = (
        f"REDDIT THREAD (r/{thread['subreddit']}):\n"
        f"Title: {thread['title']}\n"
        f"Body: {thread['body'][:1500]}\n\n"
        f"MATCHING ARTICLE:\n"
        f"Title: {article['title']}\n"
        f"Summary: {article.get('summary', '')}\n"
        f"Key topics: {', '.join(article.get('tags', []))}\n"
        f"Keywords: {', '.join(article.get('keywords', [])[:5])}\n\n"
        f"LINK_APPROPRIATE: {link_appropriate}\n"
    )
    if link_appropriate:
        user_prompt += f"ARTICLE URL (use exactly): {article_url}\n"
    else:
        user_prompt += "DO NOT include any link. Write a purely helpful reply.\n"

    body = json.dumps({
        "model": "claude-sonnet-4-6",
        "max_tokens": 500,
        "system": DRAFTING_SYSTEM_PROMPT,
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
        draft_text = result.get("content", [{}])[0].get("text", "").strip()
    except (HTTPError, URLError) as e:
        print(f"  Warning: drafting failed for {thread['thread_id']}: {e}")
        return None

    if not draft_text:
        return None

    has_link = article["url"].rstrip("/") in draft_text or "theparticlepost.com" in draft_text

    return {
        "type": "reply",
        "thread_id": thread["thread_id"],
        "subreddit": thread["subreddit"],
        "thread_title": thread["title"],
        "thread_url": thread["url"],
        "draft_text": draft_text,
        "has_link": has_link,
        "article_slug": article["slug"],
        "article_url": article_url,
        "relevance": thread.get("relevance", 0),
        "helpfulness": thread.get("helpfulness", 0),
        "scoring_reasoning": thread.get("scoring_reasoning", ""),
        "status": "pending",
        "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }


def draft_replies(scored_threads: list[dict]) -> list[dict]:
    """Draft replies for all scored threads."""
    drafts = []
    for i, thread in enumerate(scored_threads):
        print(f"  Drafting {i+1}/{len(scored_threads)}: r/{thread['subreddit']} — {thread['title'][:50]}...")
        draft = draft_reply(thread)
        if draft:
            drafts.append(draft)
    return drafts
