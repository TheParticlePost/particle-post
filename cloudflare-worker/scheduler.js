/**
 * Particle Post -- Cloudflare Worker Scheduler
 *
 * Uses a SINGLE hourly cron trigger (free plan allows max 5).
 * The worker checks the current UTC hour + day-of-week to decide
 * which workflow(s) to dispatch.
 *
 * Schedule (all UTC -> ET conversion):
 *   Hour 5  daily       -> security-audit.yml    (Midnight ET)
 *   Hour 13 daily       -> morning-post.yml      (9 AM ET)
 *   Hour 15 daily       -> ui-proactive.yml      (11 AM ET)
 *   Hour 17 daily       -> afternoon-post.yml    (1 PM ET)
 *   Hour 18 daily       -> ui-designer.yml       (2 PM ET)
 *   Hour 19 daily       -> ui-proactive.yml      (3 PM ET)
 *   Hour 22 daily       -> evening-post.yml      (6 PM ET)
 *   Hour 23 daily       -> ui-proactive.yml      (7 PM ET)
 *   Hour 0  Saturday    -> weekly-report.yml     (Fri 8 PM ET)
 *   Hour 2  Saturday    -> security-report.yml   (Fri 9 PM ET)
 *   Hour 14 Monday      -> content-audit.yml     (Mon 10 AM ET)
 */

const REPO  = 'TheParticlePost/particle-post';
const BASE  = `https://api.github.com/repos/${REPO}/actions/workflows`;
const AGENT = 'particle-post-cloudflare-scheduler/2.0';

/**
 * Returns the workflow(s) to dispatch for the given UTC hour and day.
 * @param {number} hour - UTC hour (0-23)
 * @param {number} day  - Day of week (0=Sun, 6=Sat)
 * @returns {string[]} workflow filenames to dispatch
 */
function getWorkflows(hour, day) {
  const workflows = [];

  // Daily workflows
  const dailyMap = {
    5:  'security-audit.yml',
    13: 'morning-post.yml',
    15: 'ui-proactive.yml',
    17: 'afternoon-post.yml',
    18: 'ui-designer.yml',
    19: 'ui-proactive.yml',
    22: 'evening-post.yml',
    23: 'ui-proactive.yml',
  };

  if (dailyMap[hour]) {
    workflows.push(dailyMap[hour]);
  }

  // Weekly workflows (day-specific)
  if (day === 6 && hour === 0) workflows.push('weekly-report.yml');
  if (day === 6 && hour === 2) workflows.push('security-report.yml');
  if (day === 1 && hour === 14) workflows.push('content-audit.yml');

  return workflows;
}

async function dispatchWorkflow(workflow, env) {
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
    throw new Error(`GitHub dispatch failed for ${workflow}: ${resp.status}`);
  }

  console.log(`[particle-post] Successfully dispatched ${workflow}`);
}

export default {
  async scheduled(event, env, ctx) {
    const now  = new Date();
    const hour = now.getUTCHours();
    const day  = now.getUTCDay();

    const workflows = getWorkflows(hour, day);

    if (workflows.length === 0) {
      console.log(`[particle-post] No workflows scheduled for hour=${hour} day=${day}`);
      return;
    }

    console.log(`[particle-post] Dispatching ${workflows.length} workflow(s) at hour=${hour} day=${day}: ${workflows.join(', ')}`);

    // Dispatch all workflows in parallel
    await Promise.all(workflows.map(wf => dispatchWorkflow(wf, env)));
  },

  // HTTP handler -- status page for manual checks
  async fetch(request, env, ctx) {
    const now  = new Date();
    const hour = now.getUTCHours();
    const day  = now.getUTCDay();

    const body = JSON.stringify({
      service: 'particle-post-scheduler',
      version: '2.0',
      repo: REPO,
      currentUTC: now.toISOString(),
      currentHour: hour,
      currentDay: day,
      nextWorkflows: getWorkflows(hour, day),
      fullSchedule: [
        { utcHour: 5,  days: 'daily',    workflow: 'security-audit.yml',    et: 'Midnight ET' },
        { utcHour: 13, days: 'daily',    workflow: 'morning-post.yml',      et: '9 AM ET' },
        { utcHour: 15, days: 'daily',    workflow: 'ui-proactive.yml',      et: '11 AM ET' },
        { utcHour: 17, days: 'daily',    workflow: 'afternoon-post.yml',    et: '1 PM ET' },
        { utcHour: 18, days: 'daily',    workflow: 'ui-designer.yml',       et: '2 PM ET' },
        { utcHour: 19, days: 'daily',    workflow: 'ui-proactive.yml',      et: '3 PM ET' },
        { utcHour: 22, days: 'daily',    workflow: 'evening-post.yml',      et: '6 PM ET' },
        { utcHour: 23, days: 'daily',    workflow: 'ui-proactive.yml',      et: '7 PM ET' },
        { utcHour: 0,  days: 'Saturday', workflow: 'weekly-report.yml',     et: 'Fri 8 PM ET' },
        { utcHour: 2,  days: 'Saturday', workflow: 'security-report.yml',   et: 'Fri 9 PM ET' },
        { utcHour: 14, days: 'Monday',   workflow: 'content-audit.yml',     et: 'Mon 10 AM ET' },
      ],
    }, null, 2);

    return new Response(body, {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
