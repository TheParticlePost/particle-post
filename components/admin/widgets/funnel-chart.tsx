import { cn } from "@/lib/utils";

interface FunnelSegment {
  label: string;
  count: number;
  color: string;
}

interface FunnelChartProps {
  data: FunnelSegment[];
}

export function FunnelChart({ data }: FunnelChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <p className="text-body-sm text-text-muted text-center py-8">
        No funnel data available.
      </p>
    );
  }

  // Build conic-gradient segments
  let accumulated = 0;
  const gradientParts: string[] = [];
  for (const segment of data) {
    const pct = (segment.count / total) * 100;
    gradientParts.push(
      `${segment.color} ${accumulated.toFixed(2)}% ${(accumulated + pct).toFixed(2)}%`
    );
    accumulated += pct;
  }
  const gradient = `conic-gradient(${gradientParts.join(", ")})`;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Donut chart */}
      <div className="relative w-36 h-36">
        <div
          className="w-full h-full rounded-full"
          style={{ background: gradient }}
        />
        {/* Inner circle to create donut */}
        <div
          className={cn(
            "absolute inset-0 m-auto w-20 h-20 rounded-full",
            "bg-bg-base"
          )}
        />
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-display-sm font-display text-text-primary">
            {total}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
        {data.map((segment) => {
          const pct = total > 0 ? ((segment.count / total) * 100).toFixed(0) : "0";
          return (
            <div key={segment.label} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-body-xs text-text-secondary">
                {segment.label}{" "}
                <span className="text-text-primary font-medium">
                  {segment.count}
                </span>{" "}
                <span className="text-text-muted">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
