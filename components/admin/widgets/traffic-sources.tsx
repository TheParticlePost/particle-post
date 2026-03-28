import { cn } from "@/lib/utils";

interface TrafficSource {
  name: string;
  sessions: number;
}

interface TrafficSourcesProps {
  sources: TrafficSource[];
}

export function TrafficSources({ sources }: TrafficSourcesProps) {
  const maxSessions = Math.max(...sources.map((s) => s.sessions), 1);

  if (sources.length === 0) {
    return (
      <p className="text-body-sm text-text-muted text-center py-8">
        No traffic source data available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sources.map((source) => {
        const widthPct =
          maxSessions > 0 ? (source.sessions / maxSessions) * 100 : 0;
        return (
          <div key={source.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-body-sm text-text-secondary">
                {source.name}
              </span>
              <span className="text-body-sm font-medium text-text-primary tabular-nums">
                {source.sessions} sessions
              </span>
            </div>
            <div
              className={cn(
                "h-2.5 rounded-full overflow-hidden",
                "bg-bg-low"
              )}
            >
              <div
                className="h-full rounded-full bg-accent/70 transition-all duration-500"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
