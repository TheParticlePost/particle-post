"""
Pipeline Trigger Tool — allows the Marketing Director to trigger
off-schedule article generation for trending topics.

Writes a topic directive file that the next pipeline run picks up.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field

_DIRECTIVE_PATH = Path(__file__).parents[1] / "data" / "urgent_topic.json"


class PipelineTriggerInput(BaseModel):
    topic: str = Field(description="The topic to write about (specific, actionable)")
    urgency: str = Field(
        default="normal",
        description="Urgency level: 'normal' or 'trending' (trending skips uniqueness check)",
    )


class PipelineTriggerTool(BaseTool):
    name: str = "trigger_article"
    description: str = (
        "Trigger an off-schedule article about a specific trending topic. "
        "Use ONLY when Google Trends shows a topic surging AND it aligns "
        "with our content strategy. The next scheduled pipeline run will "
        "prioritize this topic."
    )
    args_schema: Type[BaseModel] = PipelineTriggerInput

    def _run(self, topic: str, urgency: str = "normal") -> str:
        _DIRECTIVE_PATH.parent.mkdir(parents=True, exist_ok=True)
        directive = {
            "topic": topic,
            "urgency": urgency,
            "requested_by": "marketing_director",
            "requested_at": datetime.now(timezone.utc).isoformat(),
        }
        _DIRECTIVE_PATH.write_text(
            json.dumps(directive, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return f"Topic directive saved: '{topic}' (urgency: {urgency}). Next pipeline run will prioritize this topic."
