"use client";

import { cn } from "@/lib/utils";

interface DataPoint {
  date: string;
  count: number;
}

interface SubscriberChartProps {
  data: DataPoint[];
}

export function SubscriberChart({ data }: SubscriberChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-body-sm text-text-muted py-4">
        No subscriber data available yet.
      </p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      {/* Summary row */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-display-sm font-display text-accent">{total}</span>
        <span className="text-body-xs text-text-muted">
          new in last {data.length} days
        </span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-32">
        {data.map((point) => {
          const heightPercent = (point.count / maxCount) * 100;
          const dateLabel = new Date(point.date + "T12:00:00Z").toLocaleDateString(
            "en-US",
            { month: "short", day: "numeric" }
          );

          return (
            <div
              key={point.date}
              className="flex-1 flex flex-col items-center gap-1 group relative"
            >
              {/* Tooltip */}
              <div
                className={cn(
                  "absolute -top-8 left-1/2 -translate-x-1/2",
                  "px-2 py-1 rounded-md text-body-xs font-medium whitespace-nowrap",
                  "bg-bg-high text-text-primary border border-border-ghost",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                  "pointer-events-none z-10"
                )}
              >
                {point.count} subscriber{point.count !== 1 ? "s" : ""}
              </div>

              {/* Bar */}
              <div className="w-full flex items-end justify-center h-24">
                <div
                  className={cn(
                    "w-full max-w-[28px] rounded-t-md transition-all duration-300",
                    point.count > 0
                      ? "bg-accent/70 hover:bg-accent"
                      : "bg-border-ghost"
                  )}
                  style={{
                    height: `${Math.max(heightPercent, 4)}%`,
                  }}
                />
              </div>

              {/* Date label - show every other one on small datasets, every 3rd on larger */}
              <span
                className={cn(
                  "text-[10px] text-text-muted leading-none",
                  data.length > 10 ? "hidden sm:block" : ""
                )}
              >
                {dateLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
