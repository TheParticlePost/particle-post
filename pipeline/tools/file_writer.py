import json
import os
from datetime import datetime, timezone
from pathlib import Path
from crewai.tools import BaseTool

# Paths relative to repo root
POSTS_DIR = Path(__file__).parents[2] / "blog" / "content" / "posts"
HISTORY_FILE = Path(__file__).parents[2] / "blog" / "data" / "topics_history.json"


class FileWriterTool(BaseTool):
    name: str = "file_writer"
    description: str = (
        "Write the final Hugo markdown post to disk and update topics history. "
        "Input must be a JSON string with keys: 'filename' (str), 'content' (str), "
        "'title' (str), 'slug' (str), 'tags' (list of str). "
        "Returns the path of the written file on success."
    )

    def _run(self, input_json: str) -> str:
        try:
            data = json.loads(input_json)
            filename: str = data["filename"]
            content: str = data["content"]
            title: str = data["title"]
            slug: str = data["slug"]
            tags: list = data.get("tags", [])
        except (json.JSONDecodeError, KeyError) as e:
            return f"file_writer error — invalid input JSON: {e}"

        # Ensure filename ends with .md
        if not filename.endswith(".md"):
            filename += ".md"

        post_path = POSTS_DIR / filename
        POSTS_DIR.mkdir(parents=True, exist_ok=True)

        post_path.write_text(content, encoding="utf-8")

        # Update topics history
        _update_history(title=title, slug=slug, tags=tags, filename=filename)

        return f"Post written to: {post_path}"


def _update_history(title: str, slug: str, tags: list, filename: str) -> None:
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    if HISTORY_FILE.exists():
        try:
            history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            history = {"posts": []}
    else:
        history = {"posts": []}

    history["posts"].append({
        "title": title,
        "slug": slug,
        "tags": tags,
        "filename": filename,
        "published_at": datetime.now(timezone.utc).isoformat(),
    })

    # Keep only the last 60 entries (30 days at 2/day)
    history["posts"] = history["posts"][-60:]
    HISTORY_FILE.write_text(json.dumps(history, indent=2, ensure_ascii=False), encoding="utf-8")
