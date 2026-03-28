import { cn } from "@/lib/utils";

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

interface SocialQueueProps {
  items: QueueItem[];
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  posted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function SocialQueue({ items, className }: SocialQueueProps) {
  if (items.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-8",
          className
        )}
      >
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
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        </div>
        <p className="text-text-muted text-body-sm">
          No items in queue
        </p>
        <p className="text-text-muted text-body-xs mt-1">
          Articles will appear here when queued for social sharing.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, i) => (
        <div
          key={item.id ?? i}
          className={cn(
            "rounded-lg p-3",
            "bg-bg-low border border-border-ghost"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-body-sm text-text-primary font-medium truncate">
                {item.title ?? item.slug ?? "Untitled"}
              </p>
              {item.subreddit && (
                <p className="text-body-xs text-text-muted mt-0.5">
                  r/{item.subreddit}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.score != null && (
                <span className="text-body-xs text-accent font-mono">
                  {item.score}
                </span>
              )}
              {item.status && (
                <span
                  className={cn(
                    "inline-block px-2 py-0.5 rounded-md text-body-xs border font-medium",
                    STATUS_STYLES[item.status.toLowerCase()] ??
                      "bg-bg-high text-text-primary border-border-ghost"
                  )}
                >
                  {item.status}
                </span>
              )}
            </div>
          </div>
          {item.created_at && (
            <p className="text-body-xs text-text-muted mt-1">
              Queued: {item.created_at}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
