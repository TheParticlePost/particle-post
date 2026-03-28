import { cn } from "@/lib/utils";

interface SchemaEntry {
  type: string;
  count: number;
}

interface SchemaCoverageProps {
  data: SchemaEntry[];
}

export function SchemaCoverage({ data }: SchemaCoverageProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  const hasAny = data.some((d) => d.count > 0);

  if (!hasAny) {
    return (
      <p className="text-body-sm text-text-muted text-center py-8">
        No schema coverage data available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((entry) => {
        const widthPct = maxCount > 0 ? (entry.count / maxCount) * 100 : 0;
        return (
          <div key={entry.type}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-body-sm text-text-secondary">
                {entry.type}
              </span>
              <span className="text-body-sm font-medium text-text-primary tabular-nums">
                {entry.count}
              </span>
            </div>
            <div
              className={cn(
                "h-2.5 rounded-full overflow-hidden",
                "bg-bg-low"
              )}
            >
              <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
