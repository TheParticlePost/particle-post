/**
 * Particle Post Dispatcher — Cloudflare Worker
 *
 * Acts as an authenticated proxy between cron-job.org (which can't send
 * custom headers on the free plan) and GitHub Actions workflow_dispatch.
 *
 * cron-job.org calls:  GET https://particle-post-dispatcher.YOUR_SUBDOMAIN.workers.dev/morning-post.yml
 * Worker calls:        POST https://api.github.com/repos/.../actions/workflows/morning-post.yml/dispatches
 *                      Authorization: Bearer {GITHUB_TOKEN secret}
 *
 * Supported routes:
 *   /morning-post.yml
 *   /evening-post.yml
 *   /marketing-director.yml
 *   /ui-designer.yml
 *   /weekly-report.yml
 */

const ALLOWED_WORKFLOWS = new Set([
  "morning-post.yml",
  "evening-post.yml",
  "marketing-director.yml",
  "ui-designer.yml",
  "weekly-report.yml",
]);

const REPO = "TheParticlePost/particle-post";

export default {
  async fetch(request, env) {
    const url   = new URL(request.url);
    const workflow = url.pathname.replace(/^\//, ""); // strip leading slash

    if (!workflow || !ALLOWED_WORKFLOWS.has(workflow)) {
      return new Response(
        `Unknown workflow. Valid: ${[...ALLOWED_WORKFLOWS].join(", ")}`,
        { status: 404 }
      );
    }

    const apiUrl = `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/dispatches`;

    const ghResponse = await fetch(apiUrl, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept":        "application/vnd.github+json",
        "Content-Type":  "application/json",
        "User-Agent":    "particle-post-dispatcher/1.0",
      },
      body: JSON.stringify({ ref: "main" }),
    });

    // GitHub returns 204 No Content on success
    if (ghResponse.status === 204) {
      return new Response(`✓ Dispatched ${workflow}`, { status: 200 });
    }

    const body = await ghResponse.text();
    return new Response(`GitHub error ${ghResponse.status}: ${body}`, {
      status: ghResponse.status,
    });
  },
};
