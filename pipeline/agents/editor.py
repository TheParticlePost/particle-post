from pathlib import Path
from crewai import Agent, LLM

_PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"
_STYLEGUIDE_PATH = _PROMPTS_DIR / "editor_styleguide.txt"
_FALLBACK_PATH = _PROMPTS_DIR / "editor_backstory.txt"

# Prefer editor_styleguide.txt (comprehensive), fall back to editor_backstory.txt (legacy)
if _STYLEGUIDE_PATH.exists():
    _BACKSTORY = _STYLEGUIDE_PATH.read_text(encoding="utf-8")
else:
    _BACKSTORY = _FALLBACK_PATH.read_text(encoding="utf-8")

# Inline E-E-A-T self-audit replaces the content_quality_audit skill tool
# (was a separate Haiku API call costing ~500K tokens per run).
_EEAT_AUDIT = (
    "\n\nE-E-A-T SELF-AUDIT (check before outputting your revision):\n"
    "  Experience: Does the article reference real implementations, timelines, or outcomes?\n"
    "  Expertise: Are claims supported by named sources with specific data points?\n"
    "  Authority: Are sources credible institutions (banks, research firms, regulators)?\n"
    "  Trust: Are all stats attributed inline? Any vague 'studies show' or 'experts say'?\n"
    "  If any check fails, fix it in your revision and note it in the edit log.\n"
)


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
        backstory=_BACKSTORY + _EEAT_AUDIT,
        tools=[],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=8192),
        verbose=True,
        allow_delegation=False,
    )
