"""Standalone Anthropic Skills client for use outside CrewAI.

Usage:
    from pipeline.tools.skills_client import use_skills, download_files

    response = use_skills(
        prompt="Write an SEO blog post targeting 'AI fraud detection'",
        skills=[{"type": "custom", "skill_id": "skill_01...", "version": "latest"}],
    )
    download_files(response)
"""

import anthropic

client = anthropic.Anthropic()

BETAS = [
    "code-execution-2025-08-25",
    "skills-2025-10-02",
    "files-api-2025-04-14",
]


def use_skills(prompt: str, skills: list[dict], max_tokens: int = 16000):
    """Send a message using one or more skills. Handles pause_turn automatically."""
    response = client.beta.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=max_tokens,
        betas=BETAS,
        container={"skills": skills},
        messages=[{"role": "user", "content": prompt}],
        tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
    )
    while response.stop_reason == "pause_turn":
        response = client.beta.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            betas=BETAS,
            container={"id": response.container.id, "skills": skills},
            messages=[
                {"role": "user", "content": prompt},
                {"role": "assistant", "content": response.content},
                {"role": "user", "content": "Continue."},
            ],
            tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
        )
    return response


def download_files(response):
    """Download any files created by skills."""
    for block in response.content:
        if hasattr(block, "content"):
            items = (
                block.content if isinstance(block.content, list) else [block.content]
            )
            for item in items:
                if hasattr(item, "file_id") and item.file_id:
                    meta = client.beta.files.retrieve(
                        file_id=item.file_id, betas=["files-api-2025-04-14"]
                    )
                    content = client.beta.files.retrieve_content(
                        file_id=item.file_id, betas=["files-api-2025-04-14"]
                    )
                    with open(meta.filename, "wb") as f:
                        f.write(content)
                    print(f"Downloaded: {meta.filename}")
