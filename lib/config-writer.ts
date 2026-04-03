/**
 * Config Read/Write/Commit via GitHub Contents API.
 *
 * Vercel serverless can't run `git`, so we use the GitHub API to read
 * the current file SHA, then PUT the updated content with that SHA.
 * This commits directly to main — the pipeline reads config from Git.
 */

const GITHUB_REPO = "TheParticlePost/particle-post";
const GITHUB_API = "https://api.github.com";

function getToken(): string {
  const token = process.env.GH_PAT;
  if (!token) throw new Error("GH_PAT not configured");
  return token;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

interface GitHubFileResponse {
  sha: string;
  content: string;
  encoding: string;
  path: string;
}

/**
 * Read a file from the repo via GitHub Contents API.
 * Returns the parsed JSON content and the current SHA (needed for updates).
 */
export async function readConfigFromGitHub(
  filepath: string
): Promise<{ data: Record<string, unknown>; sha: string }> {
  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${filepath}`,
    { headers: headers(), cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`GitHub API error reading ${filepath}: ${res.status}`);
  }

  const file = (await res.json()) as GitHubFileResponse;
  const content = Buffer.from(file.content, "base64").toString("utf-8");

  return { data: JSON.parse(content), sha: file.sha };
}

/**
 * Write a JSON config file back to the repo via GitHub Contents API.
 * Commits directly to main with the given message.
 */
export async function writeConfigToGitHub(
  filepath: string,
  data: Record<string, unknown>,
  message: string
): Promise<{ commitSha: string }> {
  // First get current SHA
  const { sha } = await readConfigFromGitHub(filepath);

  const content = Buffer.from(
    JSON.stringify(data, null, 2) + "\n",
    "utf-8"
  ).toString("base64");

  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${filepath}`,
    {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({
        message,
        content,
        sha,
        branch: "main",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error writing ${filepath}: ${res.status} ${err}`);
  }

  const result = await res.json();
  return { commitSha: result.commit?.sha ?? "unknown" };
}

/**
 * Delete a file from the repo via GitHub Contents API.
 */
export async function deleteFileFromGitHub(
  filepath: string,
  message: string
): Promise<void> {
  const { sha } = await readConfigFromGitHub(filepath);

  const res = await fetch(
    `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${filepath}`,
    {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ message, sha, branch: "main" }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error deleting ${filepath}: ${res.status} ${err}`);
  }
}

// Allowed config file paths (security: prevent arbitrary file access)
const ALLOWED_PATHS = [
  "pipeline/config/content_strategy.json",
  "pipeline/config/marketing_strategy.json",
  "pipeline/config/seo_gso_config.json",
  "pipeline/config/post_index.json",
  "pipeline/config/affiliate_links.json",
  "pipeline/config/agent_status.json",
  "pipeline/config/topics_history.json",
];

export function isAllowedConfigPath(filepath: string): boolean {
  return ALLOWED_PATHS.includes(filepath);
}
