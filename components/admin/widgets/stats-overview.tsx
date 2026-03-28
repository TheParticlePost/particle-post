import { cn } from "@/lib/utils";

interface StatsOverviewProps {
  postCount: number;
  subscriberCount: number;
  postsThisMonth: number;
  impressions?: number;
}

interface StatCardProps {
  label: string;
  value: number | string;
  accent?: boolean;
  subtitle?: string;
}

function StatCard({ label, value, accent = false, subtitle }: StatCardProps) {
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
      <p
        className={cn(
          "text-display-md font-display mt-1 leading-none",
          accent ? "text-accent" : "text-text-primary"
        )}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-body-xs text-text-muted mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export function StatsOverview({
  postCount,
  subscriberCount,
  postsThisMonth,
  impressions,
}: StatsOverviewProps) {
  const formattedImpressions =
    impressions && impressions > 0
      ? impressions >= 1000
        ? `${(impressions / 1000).toFixed(1)}K`
        : impressions.toString()
      : "0";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Total Posts" value={postCount} accent />
      <StatCard label="Subscribers" value={subscriberCount} accent />
      <StatCard label="This Month" value={postsThisMonth} subtitle="posts published" />
      <StatCard
        label="Impressions"
        value={formattedImpressions}
        accent
        subtitle="GSC search"
      />
    </div>
  );
}
