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

interface SocialStatsProps {
  articles: ArticleEntry[];
  className?: string;
}

export function SocialStats({ articles, className }: SocialStatsProps) {
  if (articles.length === 0) {
    return (
      <div className={cn("text-text-muted text-body-sm", className)}>
        No articles indexed for sharing yet.
      </div>
    );
  }

  const totalShared = articles.reduce((sum, a) => sum + a.times_shared, 0);
  const neverShared = articles.filter((a) => a.times_shared === 0).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className={cn(
            "rounded-lg px-3 py-3 text-center",
            "bg-bg-low border border-border-ghost"
          )}
        >
          <p className="text-display-sm font-display text-accent">
            {articles.length}
          </p>
          <p className="text-body-xs text-text-muted">Indexed</p>
        </div>
        <div
          className={cn(
            "rounded-lg px-3 py-3 text-center",
            "bg-bg-low border border-border-ghost"
          )}
        >
          <p className="text-display-sm font-display text-accent">
            {totalShared}
          </p>
          <p className="text-body-xs text-text-muted">Total Shares</p>
        </div>
        <div
          className={cn(
            "rounded-lg px-3 py-3 text-center",
            "bg-bg-low border border-border-ghost"
          )}
        >
          <p className="text-display-sm font-display text-text-muted">
            {neverShared}
          </p>
          <p className="text-body-xs text-text-muted">Unshared</p>
        </div>
      </div>

      {/* Article table */}
      <div className="overflow-x-auto rounded-lg border border-border-ghost">
        <table className="w-full text-body-xs">
          <thead>
            <tr className="bg-bg-high">
              <th className="px-3 py-2 text-left text-text-muted font-medium uppercase tracking-wider">
                Article
              </th>
              <th className="px-3 py-2 text-center text-text-muted font-medium uppercase tracking-wider w-20">
                Shares
              </th>
              <th className="px-3 py-2 text-right text-text-muted font-medium uppercase tracking-wider w-28">
                Last Shared
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr
                key={article.slug}
                className="border-t border-border-ghost hover:bg-bg-low"
              >
                <td className="px-3 py-2">
                  <p className="text-text-primary font-medium truncate max-w-[300px]">
                    {article.title}
                  </p>
                  <p className="text-text-muted truncate max-w-[300px]">
                    {article.slug}
                  </p>
                </td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={cn(
                      "font-mono",
                      article.times_shared > 0
                        ? "text-accent"
                        : "text-text-muted"
                    )}
                  >
                    {article.times_shared}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-text-muted">
                  {article.last_shared_date ?? "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
