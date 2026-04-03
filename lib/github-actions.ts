/**
 * GitHub Actions API wrapper for workflow run visibility.
 */

const GITHUB_REPO = "TheParticlePost/particle-post";
const GITHUB_API = "https://api.github.com";

function headers(): Record<string, string> {
  const token = process.env.GH_PAT;
  if (!token) throw new Error("GH_PAT not configured");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed" | "waiting";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
  html_url: string;
  duration_seconds: number | null;
}

/**
 * List recent workflow runs for a specific workflow file.
 */
export async function listWorkflowRuns(
  workflow: string,
  limit = 5
): Promise<WorkflowRun[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/actions/workflows/${workflow}/runs?per_page=${limit}`,
    { headers: headers(), cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();
  const runs = data.workflow_runs || [];

  return runs.map(
    (r: {
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
      created_at: string;
      updated_at: string;
      run_started_at: string | null;
      html_url: string;
    }) => {
      const started = r.run_started_at
        ? new Date(r.run_started_at).getTime()
        : null;
      const ended =
        r.status === "completed" ? new Date(r.updated_at).getTime() : null;
      const duration =
        started && ended ? Math.round((ended - started) / 1000) : null;

      return {
        id: r.id,
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
        created_at: r.created_at,
        updated_at: r.updated_at,
        run_started_at: r.run_started_at,
        html_url: r.html_url,
        duration_seconds: duration,
      } as WorkflowRun;
    }
  );
}

/**
 * Get the log output for a specific workflow run.
 * Returns the last N lines of the combined log.
 */
export async function getRunLogs(
  runId: number,
  maxLines = 100
): Promise<string> {
  // GitHub returns logs as a zip file — use the jobs endpoint instead
  // which gives structured step outputs
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/actions/runs/${runId}/jobs?per_page=5`,
    { headers: headers(), cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`GitHub API error fetching jobs: ${res.status}`);
  }

  const data = await res.json();
  const jobs = data.jobs || [];

  const lines: string[] = [];
  for (const job of jobs) {
    lines.push(`=== Job: ${job.name} (${job.conclusion || job.status}) ===`);
    for (const step of job.steps || []) {
      const status =
        step.conclusion === "success"
          ? "✓"
          : step.conclusion === "failure"
          ? "✗"
          : "…";
      const duration =
        step.started_at && step.completed_at
          ? `${Math.round((new Date(step.completed_at).getTime() - new Date(step.started_at).getTime()) / 1000)}s`
          : "";
      lines.push(`  ${status} ${step.name} ${duration}`);
    }
  }

  return lines.slice(-maxLines).join("\n");
}
