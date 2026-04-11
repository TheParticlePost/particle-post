# Particle Post — Migration Notes

A running log of architectural changes that touch the runtime / scheduler / deploy story. Read this first if a previously-working pipeline starts misbehaving in a way that doesn't match anything in `git log`.

---

## 2026-04-10 — Removed Cloudflare Worker dispatcher, native GitHub cron everywhere

### What changed

Every scheduled workflow now uses GitHub Actions' built-in `schedule:` cron and an in-workflow `guard` job. The Cloudflare Worker dispatcher (`cloudflare-worker/`) and the cron-job.org indirection layer are gone.

**Files removed**
- `cloudflare-worker/scheduler.js`
- `cloudflare-worker/worker.js`
- `cloudflare-worker/wrangler.toml`

**Workflows touched** (all 10 added native cron + a `guard` job before their main job):

| Workflow | Cron (UTC) | ET (DST) | Guard window |
|---|---|---|---|
| `morning-post.yml` | `0 13 * * *` | 9 AM | 20h |
| `afternoon-post.yml` | `0 17 * * *` | 1 PM | 20h |
| `marketing-director.yml` | `0 16 * * *` | noon | 20h |
| `ui-designer.yml` | `0 18 * * *` | 2 PM | 20h |
| `evening-post.yml` | `0 21 * * *` | 5 PM | 20h |
| `ui-proactive.yml` | `0 15,19,23 * * *` | 11 AM / 3 PM / 7 PM | 3h |
| `weekly-report.yml` | `0 0 * * 6` | Fri 8 PM | 144h (6d) |
| `security-audit.yml` | `0 5 * * *` | 1 AM | 20h |
| `security-report.yml` | `0 2 * * 6` | Fri 10 PM | 144h (6d) |
| `content-audit.yml` | `0 14 * * 1` | Mon 10 AM | 144h (6d) |

**Other files updated**
- `.env.example` — removed `CLOUDFLARE_WORKER_TOKEN` and `CRON_JOB_API_KEY`. Removed the "/cron-job.org" mention from the `GH_WORKFLOW_PAT` comment.
- `next.config.ts` — removed `**/cloudflare-worker/**` from the webpack `ignored` list.
- `tsconfig.json` — removed `cloudflare-worker` from `exclude`.
- `pipeline/prompts/security_auditor_backstory.txt` — updated the "Stack You Monitor" section to describe the new native-cron design.

### Why

On 2026-04-10 the morning post failed in the QA gate AND the evening post couldn't deploy because:
1. The Cloudflare Worker scheduler (`scheduler.js`) had been written but never deployed — `wrangler.toml` was updated to point at it but no `wrangler deploy` followed. The deployed bundle was still the older `worker.js` HTTP proxy.
2. cron-job.org still hit `worker.js` for some workflows (morning-post, evening-post, weekly-report) but not others, so half the day's jobs silently never ran.
3. Marketing Director never fired today even on the cron-job.org path — likely a credential or job-status issue we couldn't verify without dashboard access.

Native `schedule:` cron is reliable, idempotent (via the `guard` job), runs inside the repo, and removes two external services from the critical path. The previous reason to use a Cloudflare proxy was that cron-job.org's free tier couldn't send custom auth headers — moot once GitHub itself is the dispatcher.

### How the `guard` job works

Each workflow has a tiny first job that runs before the real work:

```yaml
jobs:
  guard:
    runs-on: ubuntu-latest
    outputs:
      proceed: ${{ steps.check.outputs.proceed }}
    steps:
      - name: Skip if a recent successful run exists
        id: check
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          if [ "${{ github.event_name }}" = "workflow_dispatch" ]; then
            echo "proceed=true" >> "$GITHUB_OUTPUT"
            exit 0
          fi
          WINDOW_HOURS=20
          CUTOFF=$(date -u -d "${WINDOW_HOURS} hours ago" +%Y-%m-%dT%H:%M:%SZ)
          RECENT=$(gh run list \
            --repo "${{ github.repository }}" \
            --workflow "${{ github.workflow }}" \
            --status success \
            --created ">${CUTOFF}" \
            --json databaseId \
            --jq "map(select(.databaseId != ${{ github.run_id }})) | length")
          if [ "${RECENT:-0}" -gt 0 ]; then
            echo "proceed=false" >> "$GITHUB_OUTPUT"
          else
            echo "proceed=true" >> "$GITHUB_OUTPUT"
          fi

  publish:
    needs: guard
    if: needs.guard.outputs.proceed == 'true'
    ...
```

Properties:
- **Manual `workflow_dispatch` always proceeds** — the human is explicitly asking, never block them.
- **Cron-triggered runs proceed only if no successful run inside the window.** Window is sized smaller than the natural cadence (e.g. 3h for thrice-daily ui-proactive, 144h for weekly reports) so legitimate runs always fire but extra dispatches are no-ops.
- **The current run's databaseId is excluded from the count**, so a fresh dispatch never blocks itself.
- **Requires `permissions: actions: read`** so `gh run list` works inside the job token.

### DST caveat

GitHub Actions cron is pinned to UTC and there is no built-in DST support. All times above are calibrated for **EDT (UTC-4)**. During EST (Nov–Mar) every workflow fires **1 hour earlier in local ET**. Acceptable for all 10 workflows; revisit only if a particular slot becomes time-sensitive enough that the winter drift hurts.

### Verification — first 24h after merge

- [ ] **2026-04-11 13:00 UTC** — morning-post fires, guard says "proceed=true", publish runs
- [ ] **2026-04-11 16:00 UTC** — marketing-director fires
- [ ] **2026-04-11 17:00 UTC** — afternoon-post fires
- [ ] **2026-04-11 18:00 UTC** — ui-designer fires
- [ ] **2026-04-11 21:00 UTC** — evening-post fires
- [ ] **2026-04-11 15:00 / 19:00 / 23:00 UTC** — ui-proactive fires three times
- [ ] **2026-04-11 05:00 UTC** — security-audit fires
- [ ] **2026-04-11 00:00 UTC (Sat)** — weekly-report fires
- [ ] **2026-04-11 02:00 UTC (Sat)** — security-report fires
- [ ] **2026-04-13 14:00 UTC (Mon)** — content-audit fires

Run `gh run list --limit 30` mid-day Saturday to verify.

### Rollback procedure

If anything is broken in a way that can't be fixed in the workflow files themselves:

1. **Revert the migration commit**:
   ```bash
   git revert <commit-sha>
   git push origin main
   ```
   This restores `cloudflare-worker/`, removes the `schedule:` blocks, and removes the `guard` jobs.

2. **Re-deploy the Cloudflare Worker** (if you went the resurrection route instead of the revert):
   ```bash
   cd cloudflare-worker
   wrangler deploy
   wrangler secret put GH_DISPATCH_PAT  # paste a GitHub PAT with workflow scope
   ```
   Then verify at `https://particle-post-dispatcher.<your-subdomain>.workers.dev/` (the worker exposes a status JSON).

3. **Re-enable cron-job.org jobs** if you were using them as the primary trigger:
   - Job IDs from the old workflow comments: 7411448 (morning-post), 7411449 (marketing-director), 7411450 (evening-post), 7411451 (weekly-report).
   - These hit `https://particle-post-dispatcher.<sub>.workers.dev/<workflow>.yml` which proxies to the GitHub `workflow_dispatch` API with the auth header.

4. **Restore deleted files** from git if needed:
   ```bash
   git show <commit-sha-before-migration>:cloudflare-worker/scheduler.js > cloudflare-worker/scheduler.js
   # ... etc
   ```

### Failure modes to check first if the new system misfires

| Symptom | Likely cause | Fix |
|---|---|---|
| All cron triggers silent | Repo activity went stale > 60 days. GitHub disables cron on inactive repos. | Push any commit, or re-enable in repo settings → Actions. |
| Workflow fires but `guard` always reports skip | Window too long, or the previous run isn't being excluded properly. Check `${{ github.run_id }}` is being interpolated correctly. | Inspect the guard step logs; widen the jq filter. |
| Workflow fires but `gh run list` errors with 403 | Missing `actions: read` permission on the job. | Add `permissions: actions: read` at workflow or job level. |
| Schedule fires 1h off in winter | DST drift, expected. | Accept it, or add a second `cron:` line gated on month. |
| Two runs fire close together for the same slot | Two cron expressions overlap, or external dispatcher resurfaced. | Guard should still de-dupe — verify the second run logs the "Skipping" notice. |
| Manual `gh workflow run X` fails the guard | The dispatch bypass branch isn't working. | Check `github.event_name` interpolation in the guard step's `if` block. |

### Things NOT touched by this migration

- `dependabot-updates.yml` and any other event-driven workflows (`pull_request`, `push`) are unchanged.
- The Vercel deploy on push to `main` is unchanged.
- The Pulse Sync, content QA gate, and SEO/GSO logic are all unchanged.
- The `pipeline/` directory structure is unchanged.
