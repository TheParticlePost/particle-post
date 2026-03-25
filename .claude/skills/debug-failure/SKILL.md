---
name: debug-failure
description: Pull logs from the latest failed GitHub Actions run and diagnose the root cause. Run when a pipeline has failed.
allowed-tools: Bash
argument-hint: "[workflow-name]  (optional: morning|evening|marketing|ui-designer|ui-audit|content-audit)"
---

!`gh run list --status failure --limit 5 --json databaseId,workflowName,createdAt,url 2>&1`

# Particle Post — Failure Diagnosis

## Instructions

1. **Filter** — If `$ARGUMENTS` is provided, filter the pre-loaded failure list to match:
   - `morning` → "Morning Post"
   - `evening` → "Evening Post"
   - `marketing` → "Marketing Director"
   - `ui-designer` → "UI Designer"
   - `ui-audit` → "UI Proactive Audit"
   - `content-audit` → "Content Quality Audit"
   If blank, use the most recent failure.

2. **Pull logs** — Run: `gh run view <databaseId> --log-failed 2>&1 | tail -100`

3. **Classify failure** into one of these types:

   | Type | Pattern in Logs | Fix |
   |------|----------------|-----|
   | `TOKEN_LIMIT` | Output truncated before JSON, "max_tokens" | Raise `max_tokens` in the agent's `LLM()` call |
   | `API_ERROR` | 429, 500, 503, rate limit, timeout | Transient — re-trigger the workflow |
   | `GIT_CONFLICT` | "fetch first", "non-fast-forward" | Already handled by pull-rebase loop — re-trigger |
   | `HUGO_BUILD` | "template", "partial", "shortcode" | Template syntax error — read the error and fix |
   | `AGENT_OUTPUT` | JSON parse error, missing field | Agent produced malformed output — check backstory/task prompt |
   | `PYTHON_IMPORT` | ImportError, ModuleNotFoundError | Missing dependency — check requirements.txt |
   | `ENV_VAR` | "Missing required environment", KeyError | Secret not set in GitHub — check repo settings |

4. **Output format**:
   ```
   FAILURE DIAGNOSIS
   ─────────────────
   Workflow:  Evening Post
   Run ID:    12345678
   Time:      Mar 25, 5:02 PM ET
   Type:      TOKEN_LIMIT

   Root Cause: Production Director max_tokens=2800 was insufficient.
               Agent wrote full analysis before JSON output, got truncated.

   Fix: Raise max_tokens to 3500 in pipeline/agents/production_director.py

   Re-trigger: gh workflow run evening-post.yml --ref main
   ```

5. **If the fix requires code changes**, show the exact file and line to modify.
