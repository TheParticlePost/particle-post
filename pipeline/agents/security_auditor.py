"""
Particle Post -- Security Auditor Agent (CrewAI)

Optional agent for future LLM-powered security analysis.
The daily scanner (security_run.py) and weekly report (security_report_run.py)
are pure Python and do NOT require this agent. This exists for future use cases
like LLM-assisted vulnerability triage or natural-language security reports.
"""

from pathlib import Path
from crewai import Agent, LLM

_BACKSTORY = (Path(__file__).parents[1] / "prompts" / "security_auditor_backstory.txt").read_text(
    encoding="utf-8"
)


def build_security_auditor() -> Agent:
    """Build the Security Auditor agent."""
    return Agent(
        role="Security Auditor",
        goal=(
            "Analyze security scan results across all 7 domains (dependencies, code, "
            "secrets, workflows, config, content, key rotation). Identify patterns, "
            "rank findings by exploitability and business impact, and generate "
            "actionable fix prompts that can be pasted directly into Claude Code."
        ),
        backstory=_BACKSTORY,
        tools=[],
        llm=LLM(model="anthropic/claude-sonnet-4-6", max_tokens=8192),
        verbose=True,
        allow_delegation=False,
    )
