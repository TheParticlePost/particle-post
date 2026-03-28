"use client";

import { cn } from "@/lib/utils";

interface TickerItem {
  label: string;
  value: string;
  change?: number;
}

interface DataTickerProps {
  items: TickerItem[];
  className?: string;
}

export function DataTicker({ items, className }: DataTickerProps) {
  return (
    <div
      className={cn(
        "w-full bg-bg-deep overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-8 px-4 py-2 overflow-x-auto scrollbar-hide">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 whitespace-nowrap font-mono text-caption uppercase tracking-wide"
          >
            <span className="text-text-secondary">{item.label}</span>
            <span className="text-text-primary font-medium">{item.value}</span>
            {item.change !== undefined && (
              <span
                className={cn(
                  "font-medium",
                  item.change > 0
                    ? "text-positive"
                    : item.change < 0
                      ? "text-negative"
                      : "text-text-muted"
                )}
              >
                {item.change > 0 ? "+" : ""}
                {item.change.toFixed(2)}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
