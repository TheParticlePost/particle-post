"""CLI-based approval queue for reviewing drafted replies and posts.

Nothing gets posted without explicit user approval. Supports:
approve, edit, reject, skip actions.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

_QUEUE_PATH = Path(__file__).resolve().parent / "data" / "queue.json"


def _load_queue() -> list[dict]:
    if not _QUEUE_PATH.exists():
        return []
    try:
        return json.loads(_QUEUE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return []


def _save_queue(queue: list[dict]):
    _QUEUE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _QUEUE_PATH.write_text(json.dumps(queue, indent=2), encoding="utf-8")


def add_to_queue(items: list[dict]):
    """Add drafted items to the approval queue."""
    queue = _load_queue()
    existing_ids = {
        (q.get("thread_id", ""), q.get("type", ""))
        for q in queue
    }
    added = 0
    for item in items:
        key = (item.get("thread_id", ""), item.get("type", ""))
        if key not in existing_ids:
            queue.append(item)
            existing_ids.add(key)
            added += 1
    _save_queue(queue)
    return added


def get_pending() -> list[dict]:
    """Get all pending items from the queue."""
    return [item for item in _load_queue() if item.get("status") == "pending"]


def get_approved() -> list[dict]:
    """Get all approved items ready to post."""
    return [item for item in _load_queue() if item.get("status") == "approved"]


def update_status(index: int, status: str, edited_text: str | None = None):
    """Update an item's status in the queue."""
    queue = _load_queue()
    pending = [i for i, q in enumerate(queue) if q.get("status") == "pending"]
    if index < 0 or index >= len(pending):
        return False
    real_idx = pending[index]
    queue[real_idx]["status"] = status
    queue[real_idx]["reviewed_at"] = datetime.now(timezone.utc).isoformat()
    if edited_text is not None:
        if queue[real_idx]["type"] == "reply":
            queue[real_idx]["draft_text"] = edited_text
        else:
            queue[real_idx]["post_body"] = edited_text
    _save_queue(queue)
    return True


def review_interactive():
    """Interactive CLI review of pending queue items."""
    pending = get_pending()
    if not pending:
        print("\n  No pending items in the approval queue.")
        return

    print(f"\n  Approval Queue — {len(pending)} items pending\n")

    for i, item in enumerate(pending):
        print(f"{'='*70}")
        if item["type"] == "reply":
            print(f"  [{i+1}] REPLY to r/{item['subreddit']}: \"{item['thread_title'][:60]}\"")
            print(f"      Thread: {item['thread_url']}")
            print(f"      Relevance: {item.get('relevance', '?')}/10 | "
                  f"Helpfulness: {item.get('helpfulness', '?')}/10 | "
                  f"Link: {'Yes' if item.get('has_link') else 'No'}")
            print(f"      Article: {item.get('article_slug', '?')}")
            print(f"      Reasoning: {item.get('scoring_reasoning', '')}")
            print(f"\n      Draft:\n")
            for line in item.get("draft_text", "").split("\n"):
                print(f"        {line}")
        else:
            print(f"  [{i+1}] ORIGINAL POST to r/{item.get('subreddit', '?')}")
            print(f"      Title: {item.get('post_title', '?')}")
            print(f"      Article: {item.get('article_slug', '?')}")
            print(f"\n      Body:\n")
            for line in item.get("post_body", "").split("\n"):
                print(f"        {line}")

        print()
        while True:
            choice = input("      [A]pprove  [E]dit  [R]eject  [S]kip  [Q]uit: ").strip().lower()
            if choice == "a":
                update_status(i, "approved")
                print("      -> Approved")
                break
            elif choice == "e":
                print("      Enter new text (end with empty line):")
                lines = []
                while True:
                    line = input("        ")
                    if line == "":
                        break
                    lines.append(line)
                new_text = "\n".join(lines)
                if new_text:
                    update_status(i, "approved", edited_text=new_text)
                    print("      -> Edited and approved")
                else:
                    print("      -> No changes, skipping")
                break
            elif choice == "r":
                update_status(i, "rejected")
                print("      -> Rejected")
                break
            elif choice == "s":
                print("      -> Skipped (still pending)")
                break
            elif choice == "q":
                print("      -> Quitting review")
                return
            else:
                print("      Invalid choice. Use A/E/R/S/Q.")
