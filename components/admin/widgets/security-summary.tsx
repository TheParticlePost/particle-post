import { cn } from "@/lib/utils";

interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface SecuritySummaryProps {
  summary: SeverityCounts;
  className?: string;
}

const SEVERITY_CONFIG = [
  {
    key: "critical" as const,
    label: "Critical",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    dotColor: "bg-red-500",
  },
  {
    key: "high" as const,
    label: "High",
    color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    dotColor: "bg-orange-500",
  },
  {
    key: "medium" as const,
    label: "Medium",
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    dotColor: "bg-yellow-500",
  },
  {
    key: "low" as const,
    label: "Low",
    color: "bg-bg-low text-text-muted border-border-ghost",
    dotColor: "bg-gray-500",
  },
];

export function SecuritySummary({ summary, className }: SecuritySummaryProps) {
  const total =
    summary.critical + summary.high + summary.medium + summary.low;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SEVERITY_CONFIG.map((sev) => {
          const count = summary[sev.key];
          return (
            <div
              key={sev.key}
              className={cn(
                "rounded-lg px-4 py-4 border text-center",
                sev.color
              )}
            >
              <p className="text-display-md font-display leading-none">
                {count}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-2">
                <div className={cn("w-2 h-2 rounded-full", sev.dotColor)} />
                <p className="text-body-xs font-medium uppercase tracking-wider">
                  {sev.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-body-xs text-text-muted text-center">
        {total} total finding{total !== 1 ? "s" : ""} across all severity levels
      </p>
    </div>
  );
}
