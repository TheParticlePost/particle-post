---
name: check-runs
description: Show GitHub Actions workflow run statuses for all Particle Post pipelines. Use to check if morning post, evening post, marketing director, UI designer, UI proactive audit, content audit, and weekly report ran successfully.
allowed-tools: Bash
---

!`gh run list --limit 30 --json workflowName,status,conclusion,createdAt,event 2>&1`

# Particle Post — Pipeline Status Dashboard

Parse the pre-loaded JSON above and present a compact status table.

## Instructions

1. **Group by workflow**, show the most recent run for each:
   - Morning Post (9am ET)
   - Evening Post (5pm ET)
   - Marketing Director (noon ET)
   - UI Designer — Directive (1pm ET)
   - UI Proactive Audit (11am, 3pm, 7pm ET)
   - Content Quality Audit (Monday 10am ET)
   - Weekly Report (Friday 8pm ET)

2. **Status symbols**:
   - `PASS` = success
   - `FAIL` = failure
   - `RUN` = in_progress
   - `SKIP` = cancelled/skipped

3. **Output format** — compact table:
   ```
   Workflow               | Last Run (ET)      | Trigger  | Status
   ─────────────────────────────────────────────────────────────────
   Morning Post           | Mar 25, 09:02 AM   | cron     | PASS
   Evening Post           | Mar 24, 05:01 PM   | cron     | FAIL
   ```

4. **Flag any workflow** that hasn't run in >26 hours as `MISSED`.

5. **For failures**, show the re-trigger command:
   ```
   To re-trigger: gh workflow run evening-post.yml --ref main
   ```

6. **Show UI proactive audit count** for today (how many of the 3 daily runs completed).
