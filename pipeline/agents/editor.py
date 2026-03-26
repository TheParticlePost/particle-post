from pathlib import Path
from crewai import Agent, LLM
from pipeline.tools.anthropic_skill import make_skill_tool

_PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"
_STYLEGUIDE_PATH = _PROMPTS_DIR / "editor_styleguide.txt"
_FALLBACK_PATH = _PROMPTS_DIR / "editor_backstory.txt"

# Prefer editor_styleguide.txt (comprehensive), fall back to editor_backstory.txt (legacy)
if _STYLEGUIDE_PATH.exists():
    _BACKSTORY = _STYLEGUIDE_PATH.read_text(encoding="utf-8")
else:
    _BACKSTORY = _FALLBACK_PATH.read_text(encoding="utf-8")


def build_editor() -> Agent:
    return Agent(
        role="Editor",
        goal=(
            "Review and improve the article draft for quality, accuracy, tone, "
            "and adherence to the Particle Post style guide. Check H2 heading quality, "
            "preserve GSO structure (answer-first, FAQ, Key Takeaway), and ensure visual "
            "diversity markers (STAT:) survive editing. Return the improved article "
            "followed by a brief edit log."
        ),
        backstory=_BACKSTORY,
        tools=[
            make_skill_tool(
                name="content_quality_audit",
                description=(
                    "Audit article content against Google E-E-A-T rubric. "
                    "Scores Experience, Expertise, Authoritativeness, Trustworthiness "
                    "and provides specific remediation steps. Input: article text."
                ),
                skill_ids=["skill_01WR6KJsiHVuBoTguex7GwBY"],
                model="claude-haiku-4-5-20251001",
            ),
        ],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=8192),
        verbose=True,
        allow_delegation=False,
    )
