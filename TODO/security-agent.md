# Security Agent

**Status:** IMPLEMENTED
**Priority:** HIGH
**Completed:** 2026-03-25

## Requirements

- Automated security scanning of all pipeline code
- OWASP Top 10 compliance checking
- API key rotation monitoring
- Dependency vulnerability scanning (pip audit)
- CI/CD pipeline security (GitHub Actions permissions audit)
- Weekly security report alongside existing weekly report

## Skills to integrate when implementing

- Sentry security-review (already installed as skill)
- OWASP security skill (already installed as skill)
- GitHub Actions security-review command (already in .claude/commands/)

## Implementation notes

- New agent: `pipeline/agents/security_auditor.py`
- New workflow: `.github/workflows/security-audit.yml`
- Runs weekly (Sundays) or on-demand
- Reports to weekly-report.yml output
- Scans: Python imports, env var handling, git secrets, Actions permissions, dependency CVEs
