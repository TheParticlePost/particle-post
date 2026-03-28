import { cn } from "@/lib/utils";

interface PipelineStatusProps {
  lastRunDate: string | null;
  totalPosts: number;
  rejectCount: number;
}

export function PipelineStatus({
  lastRunDate,
  totalPosts,
  rejectCount,
}: PipelineStatusProps) {
  const successRate =
    totalPosts > 0
      ? (((totalPosts - rejectCount) / totalPosts) * 100).toFixed(1)
      : "100";
  const isHealthy = Number(successRate) >= 80;

  const formattedDate = lastRunDate
    ? new Date(lastRunDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Never";

  return (
    <div className="space-y-4">
      {/* Health indicator */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-3 h-3 rounded-full shrink-0",
            isHealthy ? "bg-accent animate-pulse-dot" : "bg-danger"
          )}
        />
        <span className="text-body-sm font-medium text-text-primary">
          Pipeline {isHealthy ? "Healthy" : "Needs Attention"}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-bg-low border border-border-ghost px-3 py-2.5">
          <p className="text-body-xs text-text-muted">Last Run</p>
          <p className="text-body-sm font-medium text-foreground mt-0.5">
            {formattedDate}
          </p>
        </div>
        <div className="rounded-lg bg-bg-low border border-border-ghost px-3 py-2.5">
          <p className="text-body-xs text-text-muted">Success Rate</p>
          <p
            className={cn(
              "text-body-sm font-medium mt-0.5",
              isHealthy ? "text-accent" : "text-danger"
            )}
          >
            {successRate}%
          </p>
        </div>
        <div className="rounded-lg bg-bg-low border border-border-ghost px-3 py-2.5">
          <p className="text-body-xs text-text-muted">Total Generated</p>
          <p className="text-body-sm font-medium text-foreground mt-0.5">
            {totalPosts}
          </p>
        </div>
        <div className="rounded-lg bg-bg-low border border-border-ghost px-3 py-2.5">
          <p className="text-body-xs text-text-muted">Rejected</p>
          <p
            className={cn(
              "text-body-sm font-medium mt-0.5",
              rejectCount > 0 ? "text-warning" : "text-text-primary"
            )}
          >
            {rejectCount}
          </p>
        </div>
      </div>
    </div>
  );
}
