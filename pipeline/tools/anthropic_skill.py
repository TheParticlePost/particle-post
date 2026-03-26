"""CrewAI BaseTool wrapper for Anthropic API Skills.

Allows any CrewAI agent to call Anthropic Skills via the Messages API.
Configure per-agent by passing specific skill_ids.

Usage:
    from pipeline.tools.anthropic_skill import make_skill_tool

    tool = make_skill_tool(
        name="seo_audit",
        description="Run an SEO audit on content using Anthropic Skills",
        skill_ids=["skill_01Vfz4w2KDBGugoUXP5YJHVP"],
    )
"""

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from crewai.tools import BaseTool

BETAS = [
    "code-execution-2025-08-25",
    "skills-2025-10-02",
    "files-api-2025-04-14",
]


class AnthropicSkillTool(BaseTool):
    """Calls one or more Anthropic API Skills and returns the text result."""

    name: str = "anthropic_skill"
    description: str = "Run an Anthropic API Skill on the given prompt."
    skill_ids: list = []
    model: str = "claude-sonnet-4-6"

    def _run(self, prompt: str) -> str:
        api_key = os.environ.get("ANTHROPIC_API_KEY", "")
        if not api_key:
            return json.dumps({"error": "ANTHROPIC_API_KEY not set"})
        if not self.skill_ids:
            return json.dumps({"error": "No skill_ids configured"})

        skills = [
            {"type": "custom", "skill_id": sid, "version": "latest"}
            for sid in self.skill_ids
        ]

        body = {
            "model": self.model,
            "max_tokens": 16000,
            "betas": BETAS,
            "container": {"skills": skills},
            "messages": [{"role": "user", "content": prompt}],
            "tools": [{"type": "code_execution_20250825", "name": "code_execution"}],
        }

        try:
            response = self._call_api(api_key, body)

            # Handle pause_turn (multi-step skill execution)
            attempts = 0
            while response.get("stop_reason") == "pause_turn" and attempts < 5:
                attempts += 1
                container_id = response.get("container", {}).get("id")
                if not container_id:
                    break

                body["container"] = {"id": container_id, "skills": skills}
                body["messages"] = [
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": response.get("content", [])},
                    {"role": "user", "content": "Continue."},
                ]
                response = self._call_api(api_key, body)

            # Extract text from response content blocks
            content = response.get("content", [])
            text_parts = []
            for block in content:
                if isinstance(block, dict) and block.get("type") == "text":
                    text_parts.append(block["text"])
            return "\n".join(text_parts) if text_parts else json.dumps(response)

        except HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            return json.dumps({"error": f"API error {e.code}: {error_body[:500]}"})
        except URLError as e:
            return json.dumps({"error": f"Network error: {str(e)}"})
        except Exception as e:
            return json.dumps({"error": f"Skill execution error: {str(e)}"})

    def _call_api(self, api_key: str, body: dict) -> dict:
        """Make a single call to the Anthropic Messages API."""
        data = json.dumps(body).encode("utf-8")
        req = Request(
            "https://api.anthropic.com/v1/messages",
            data=data,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "anthropic-beta": ",".join(BETAS),
                "content-type": "application/json",
            },
            method="POST",
        )
        with urlopen(req, timeout=120) as resp:
            return json.loads(resp.read())


def make_skill_tool(
    name: str,
    description: str,
    skill_ids: list,
    model: str = "claude-sonnet-4-6",
) -> AnthropicSkillTool:
    """Factory to create a configured skill tool for a specific agent."""
    return AnthropicSkillTool(
        name=name,
        description=description,
        skill_ids=skill_ids,
        model=model,
    )
