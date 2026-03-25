---
name: run-pipeline
description: Manually trigger a Particle Post pipeline run on GitHub Actions.
allowed-tools: Bash
argument-hint: "morning | evening | marketing | ui-designer | ui-audit | content-audit | weekly"
---

# Particle Post — Manual Pipeline Trigger

## Workflow Map

| Argument | Workflow File | Description |
|----------|--------------|-------------|
| `morning` | morning-post.yml | Publish morning article (LIVE) |
| `evening` | evening-post.yml | Publish evening article (LIVE) |
| `marketing` | marketing-director.yml | Run marketing analysis |
| `ui-designer` | ui-designer.yml | Run UI directive mode |
| `ui-audit` | ui-proactive.yml | Run UI proactive audit |
| `content-audit` | content-audit.yml | Run content quality audit |
| `weekly` | weekly-report.yml | Send weekly report email |

## Instructions

1. **Validate** — Check that `$ARGUMENTS` matches one of the values above.
   If not provided or invalid, list the valid options and ask which to run.

2. **Safety warning** for `morning` and `evening`:
   > WARNING: This will publish a real article to theparticlepost.com.
   > Are you sure you want to trigger a $ARGUMENTS run?

   Wait for explicit confirmation before proceeding.

   For other workflows (marketing, ui-designer, ui-audit, content-audit, weekly), proceed without extra confirmation.

3. **Dispatch** — Run:
   ```
   gh workflow run <workflow-file> --ref main
   ```

4. **Confirm** — Wait 3 seconds, then run:
   ```
   gh run list --workflow <workflow-file> --limit 1 --json databaseId,status,createdAt,url
   ```

5. **Output** — Show the run URL and status:
   ```
   Dispatched: evening-post.yml
   Run ID:     12345678
   Status:     queued
   URL:        https://github.com/TheParticlePost/particle-post/actions/runs/12345678
   ```
