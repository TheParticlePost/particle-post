/**
 * Particle Post — Cloudflare Worker Scheduler
 *
 * Triggers GitHub Actions workflows on a reliable cron schedule.
 * Replaces the unreliable GitHub Actions built-in scheduler (which can
 * delay 1-4 hours on free repos under high load).
 *
 * Cron triggers (all UTC):
 *   0 13 * * *    → morning-post.yml      (9 AM ET)
 *   0 15 * * *    → ui-proactive.yml      (11 AM ET — UI audit #1)
 *   0 17 * * *    → marketing-director.yml (noon ET)
 *   0 18 * * *    → ui-designer.yml       (1 PM ET — directive mode after marketing)
 *   0 19 * * *    → ui-proactive.yml      (3 PM ET — UI audit #2)
 *   0 21 * * *    → evening-post.yml      (5 PM ET)
 *   0 23 * * *    → ui-proactive.yml      (7 PM ET — UI audit #3)
 *   0 0 * * 6     → weekly-report.yml     (Friday 8 PM ET = Saturday 00:00 UTC)
 *   0 14 * * 1    → content-audit.yml     (Monday 10 AM ET)
 *   0 5 * * *     → security-audit.yml   (Midnight ET — daily security scan)
 *   0 2 * * 6     → security-report.yml  (Friday 9 PM ET — weekly security report)
 */

const REPO  = 'TheParticlePost/particle-post';
const BASE  = `https://api.github.com/repos/${REPO}/actions/workflows`;
const AGENT = 'particle-post-cloudflare-scheduler/1.0';

// Map cron expression → workflow filename
const CRON_MAP = {
  '0 13 * * *': 'morning-post.yml',
  '0 15 * * *': 'ui-proactive.yml',
  '0 17 * * *': 'marketing-director.yml',
  '0 18 * * *': 'ui-designer.yml',
  '0 19 * * *': 'ui-proactive.yml',
  '0 21 * * *': 'evening-post.yml',
  '0 23 * * *': 'ui-proactive.yml',
  '0 0 * * 6':  'weekly-report.yml',
  '0 14 * * 1': 'content-audit.yml',
  '0 5 * * *':  'security-audit.yml',
  '0 2 * * 6':  'security-report.yml',
};

export default {
  async scheduled(event, env, ctx) {
    const workflow = CRON_MAP[event.cron];

    if (!workflow) {
      console.error(`[particle-post] Unknown cron expression: "${event.cron}"`);
      return;
    }

    console.log(`[particle-post] Dispatching ${workflow} (cron: ${event.cron})`);

    const resp = await fetch(`${BASE}/${workflow}/dispatches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GH_DISPATCH_PAT}`,
        'Accept':        'application/vnd.github.v3+json',
        'Content-Type':  'application/json',
        'User-Agent':    AGENT,
      },
      body: JSON.stringify({ ref: 'main' }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error(`[particle-post] GitHub API error ${resp.status} for ${workflow}: ${body}`);
      // Re-throw so Cloudflare retries the cron
      throw new Error(`GitHub dispatch failed: ${resp.status}`);
    }

    console.log(`[particle-post] Successfully dispatched ${workflow}`);
  },

  // HTTP handler — returns status page for manual checks
  async fetch(request, env, ctx) {
    const url  = new URL(request.url);
    const body = JSON.stringify({
      service: 'particle-post-scheduler',
      repo:    REPO,
      schedules: Object.entries(CRON_MAP).map(([cron, wf]) => ({ cron, workflow: wf })),
    }, null, 2);

    return new Response(body, {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
