import { cn } from "@/lib/utils";

interface SeoMetricsProps {
  totalPages: number;
  sitemapUrl: string;
}

interface MetricRowProps {
  label: string;
  value: string | number;
  status?: "good" | "warning" | "neutral";
}

function MetricRow({ label, value, status = "neutral" }: MetricRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border-ghost last:border-0">
      <span className="text-body-sm text-text-secondary">{label}</span>
      <span
        className={cn(
          "text-body-sm font-medium",
          status === "good" && "text-accent",
          status === "warning" && "text-warning",
          status === "neutral" && "text-text-primary"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function SeoMetrics({ totalPages, sitemapUrl }: SeoMetricsProps) {
  return (
    <div className="space-y-1">
      <MetricRow
        label="Indexed Pages"
        value={totalPages}
        status={totalPages > 0 ? "good" : "warning"}
      />
      <MetricRow label="Sitemap" value="Active" status="good" />
      <MetricRow label="JSON-LD Schema" value="Article + WebSite" status="good" />
      <MetricRow label="Open Graph" value="Configured" status="good" />

      <div className="pt-3">
        <a
          href={sitemapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 text-body-xs text-accent",
            "hover:text-accent-hover transition-colors duration-200"
          )}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          View Sitemap
        </a>
      </div>
    </div>
  );
}
