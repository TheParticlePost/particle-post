import path from "path";
import fs from "fs/promises";
import { WidgetCard } from "@/components/admin/widget-card";
import { SocialQueue } from "@/components/admin/widgets/social-queue";
import { SocialStats } from "@/components/admin/widgets/social-stats";
import { cn } from "@/lib/utils";

interface ArticleEntry {
  slug: string;
  title: string;
  url: string;
  date?: string;
  funnel_type?: string;
  times_shared: number;
  last_shared_date: string | null;
}

interface QueueItem {
  id?: string;
  slug?: string;
  title?: string;
  subreddit?: string;
  status?: string;
  score?: number;
  created_at?: string;
  [key: string]: unknown;
}

interface PostedHistoryEntry {
  slug?: string;
  title?: string;
  subreddit?: string;
  posted_at?: string;
  url?: string;
  status?: string;
}

interface SocialConfig {
  subreddits?: string[];
  scoring_thresholds?: {
    min_relevance?: number;
    min_helpfulness?: number;
  };
  rate_limits?: {
    max_replies_per_day?: number;
    min_minutes_between_replies?: number;
    max_original_posts_per_week?: number;
    self_promo_ratio_max?: number;
  };
  thread_filters?: Record<string, unknown>;
  site_url?: string;
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default async function SocialPage() {
  const socialDataDir = path.join(process.cwd(), "pipeline/social/data");
  const socialConfigPath = path.join(
    process.cwd(),
    "pipeline/social/config/social_config.json"
  );

  const [articleIndex, queue, postedHistory, socialConfig] = await Promise.all([
    readJson<ArticleEntry[]>(path.join(socialDataDir, "article_index.json")),
    readJson<QueueItem[]>(path.join(socialDataDir, "queue.json")),
    readJson<PostedHistoryEntry[]>(
      path.join(socialDataDir, "posted_history.json")
    ),
    readJson<SocialConfig>(socialConfigPath),
  ]);

  const articles = articleIndex ?? [];
  const queueItems = queue ?? [];
  const history = postedHistory ?? [];
  const config = socialConfig ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-display-lg text-text-primary">
          Social Media Agent
        </h1>
        <p className="text-body-sm text-text-muted mt-1">
          Reddit sharing agent status, article index, and posting queue.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Status */}
        <WidgetCard title="Status">
          <div className="space-y-4">
            {/* Reddit API Status */}
            <div
              className={cn(
                "rounded-lg p-4",
                "bg-amber-500/5 border border-amber-500/20"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <p className="text-body-sm font-medium text-amber-400">
                  Reddit API: Pending Approval
                </p>
              </div>
              <p className="text-body-xs text-text-muted mt-2">
                The Reddit API application is awaiting approval. Social posting
                is not yet active. The agent will begin operating once API access
                is granted.
              </p>
            </div>

            {/* Config Summary */}
            {config && (
              <div className="space-y-3">
                <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider">
                  Agent Configuration
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={cn(
                      "rounded-lg px-3 py-3",
                      "bg-bg-low border border-border-ghost"
                    )}
                  >
                    <p className="text-display-sm font-display text-accent">
                      {config.subreddits?.length ?? 0}
                    </p>
                    <p className="text-body-xs text-text-muted">
                      Target Subreddits
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-3",
                      "bg-bg-low border border-border-ghost"
                    )}
                  >
                    <p className="text-display-sm font-display text-accent">
                      {config.rate_limits?.max_replies_per_day ?? "N/A"}
                    </p>
                    <p className="text-body-xs text-text-muted">
                      Max Replies/Day
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-3",
                      "bg-bg-low border border-border-ghost"
                    )}
                  >
                    <p className="text-display-sm font-display text-accent">
                      {config.rate_limits?.max_original_posts_per_week ?? "N/A"}
                    </p>
                    <p className="text-body-xs text-text-muted">
                      Max Posts/Week
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-lg px-3 py-3",
                      "bg-bg-low border border-border-ghost"
                    )}
                  >
                    <p className="text-display-sm font-display text-text-primary">
                      {config.rate_limits?.self_promo_ratio_max != null
                        ? `${config.rate_limits.self_promo_ratio_max * 100}%`
                        : "N/A"}
                    </p>
                    <p className="text-body-xs text-text-muted">
                      Self-Promo Limit
                    </p>
                  </div>
                </div>

                {/* Subreddit list */}
                {config.subreddits && config.subreddits.length > 0 && (
                  <div>
                    <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider mb-2">
                      Target Subreddits
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {config.subreddits.map((sub) => (
                        <span
                          key={sub}
                          className="inline-block px-2 py-0.5 rounded-md text-body-xs bg-accent/10 text-accent border border-accent/20"
                        >
                          r/{sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scoring */}
                {config.scoring_thresholds && (
                  <div>
                    <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider mb-2">
                      Scoring Thresholds
                    </h3>
                    <div className="flex gap-4">
                      <p className="text-body-xs text-text-secondary">
                        Min relevance:{" "}
                        <span className="text-accent font-mono">
                          {config.scoring_thresholds.min_relevance}
                        </span>
                      </p>
                      <p className="text-body-xs text-text-secondary">
                        Min helpfulness:{" "}
                        <span className="text-accent font-mono">
                          {config.scoring_thresholds.min_helpfulness}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!config && (
              <p className="text-text-muted text-body-sm">
                No social config found. Create{" "}
                <code className="text-accent text-body-xs font-mono">
                  pipeline/social/config/social_config.json
                </code>{" "}
                to configure the agent.
              </p>
            )}
          </div>
        </WidgetCard>

        {/* Card 2: Article Index */}
        <WidgetCard title="Article Index">
          <SocialStats articles={articles} />
        </WidgetCard>

        {/* Card 3: Approval Queue */}
        <WidgetCard title="Approval Queue">
          <SocialQueue items={queueItems} />
        </WidgetCard>

        {/* Card 4: Posting History */}
        <WidgetCard title="Posting History">
          {history.length > 0 ? (
            <div className="space-y-2">
              {history.map((entry, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg p-3",
                    "bg-bg-low border border-border-ghost"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm text-text-primary font-medium truncate">
                        {entry.title ?? entry.slug ?? "Untitled"}
                      </p>
                      {entry.subreddit && (
                        <p className="text-body-xs text-text-muted mt-0.5">
                          r/{entry.subreddit}
                        </p>
                      )}
                    </div>
                    {entry.status && (
                      <span
                        className={cn(
                          "inline-block px-2 py-0.5 rounded-md text-body-xs border font-medium shrink-0",
                          entry.status === "success"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        )}
                      >
                        {entry.status}
                      </span>
                    )}
                  </div>
                  {entry.posted_at && (
                    <p className="text-body-xs text-text-muted mt-1">
                      Posted: {entry.posted_at}
                    </p>
                  )}
                  {entry.url && (
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-body-xs text-accent hover:text-accent-hover mt-1 inline-block"
                    >
                      View post
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-bg-low border border-border-ghost flex items-center justify-center mb-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-text-muted"
                >
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <p className="text-text-muted text-body-sm">
                No posts yet
              </p>
              <p className="text-text-muted text-body-xs mt-1">
                Posting history will appear here once the Reddit agent is active.
              </p>
            </div>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}
