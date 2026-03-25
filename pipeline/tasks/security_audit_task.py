"""
Particle Post -- Security Audit Task (CrewAI)

Optional task for future LLM-powered security analysis.
Not used by the daily scanner or weekly report (both pure Python).
"""

from crewai import Agent, Task


def build_security_audit_task(agent: Agent, scan_results_json: str) -> Task:
    """Build a task for the Security Auditor to analyze scan results."""
    return Task(
        description=(
            "Analyze the following security scan results from the Particle Post pipeline.\n\n"
            "For each finding:\n"
            "1. Assess real-world exploitability (is this actually dangerous or just theoretical?)\n"
            "2. Rank by business impact (data breach > site outage > degraded content > informational)\n"
            "3. Generate a specific, copy-pasteable fix prompt for Claude Code\n"
            "4. Identify any patterns across findings (e.g., systematic issues)\n\n"
            f"Scan results:\n{scan_results_json}\n\n"
            "Output a JSON object with:\n"
            '{\n'
            '  "triage": [{"title": "...", "real_severity": "...", "exploitability": "...", '
            '"fix_prompt": "...", "business_impact": "..."}],\n'
            '  "patterns": ["pattern 1", "pattern 2"],\n'
            '  "executive_summary": "2-3 sentence summary for the site owner"\n'
            '}\n\n'
            "Return ONLY valid JSON."
        ),
        expected_output="JSON with triaged findings, patterns, and executive summary.",
        agent=agent,
    )
