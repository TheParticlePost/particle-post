import { cn } from "@/lib/utils";

interface Metric {
  label: string;
  value: string;
  subtext?: string;
}

interface AnalyticsOverviewProps {
  metrics: Metric[];
}

function MetricCard({ label, value, subtext }: Metric) {
  return (
    <div
      className={cn(
        "rounded-lg px-4 py-4",
        "bg-bg-low border border-border-ghost"
      )}
    >
      <p className="text-body-xs text-text-muted font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className="text-display-md font-display mt-1 leading-none text-accent">
        {value}
      </p>
      {subtext && (
        <p className="text-body-xs text-text-muted mt-1">{subtext}</p>
      )}
    </div>
  );
}

export function AnalyticsOverview({ metrics }: AnalyticsOverviewProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}
