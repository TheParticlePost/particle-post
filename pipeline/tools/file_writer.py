import json
from datetime import datetime, timezone
from pathlib import Path
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

# Paths relative to repo root
POSTS_DIR = Path(__file__).parents[2] / "blog" / "content" / "posts"
HISTORY_FILE = Path(__file__).parents[2] / "blog" / "data" / "topics_history.json"


class FileWriterToolSchema(BaseModel):
    filename: str = Field(
        ...,
        description="The .md filename for the post, e.g. '2026-03-21-ai-agents-enterprise.md'",
    )
    content: str = Field(
        ...,
        description="The complete Hugo markdown content, starting with --- (YAML frontmatter).",
    )
    title: str = Field(
        ...,
        description="The article title, used for history tracking.",
    )
    slug: str = Field(
        ...,
        description="The URL slug, e.g. 'ai-agents-enterprise-computing'.",
    )
    tags: str = Field(
        default="[]",
        description="JSON array of tag strings, e.g. '[\"AI\", \"Finance\", \"Agents\"]'.",
    )


class FileWriterTool(BaseTool):
    name: str = "file_writer"
    description: str = (
        "Write the final Hugo markdown post to disk and update the topics history. "
        "Pass each field as a separate named argument: filename, content, title, slug, tags. "
        "Returns the path of the written file on success."
    )
    args_schema: type[BaseModel] = FileWriterToolSchema

    def _run(
        self,
        filename: str,
        content: str,
        title: str,
        slug: str,
        tags: str = "[]",
    ) -> str:
        # Ensure filename ends with .md
        if not filename.endswith(".md"):
            filename += ".md"

        post_path = POSTS_DIR / filename
        POSTS_DIR.mkdir(parents=True, exist_ok=True)

        post_path.write_text(content, encoding="utf-8")

        # Parse tags safely
        try:
            parsed_tags: list = json.loads(tags)
        except (json.JSONDecodeError, TypeError):
            parsed_tags = []

        # Update topics history
        _update_history(title=title, slug=slug, tags=parsed_tags, filename=filename)

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
