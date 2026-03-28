import { getSupabaseClient } from "@/lib/supabase";
import { WidgetCard } from "@/components/admin/widget-card";
import { SubscriberChart } from "@/components/admin/widgets/subscriber-chart";
import { SubscriberList } from "@/components/admin/widgets/subscriber-list";

interface SubscriberStats {
  totalActive: number;
  totalInactive: number;
  newThisWeek: number;
  newThisMonth: number;
}

async function getSubscriberStats(): Promise<SubscriberStats> {
  try {
    const supabase = getSupabaseClient();

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeRes, inactiveRes, weekRes, monthRes] = await Promise.all([
      supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .neq("status", "active"),
      supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .gte("subscribed_at", weekAgo.toISOString()),
      supabase
        .from("subscribers")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .gte("subscribed_at", monthStart.toISOString()),
    ]);

    return {
      totalActive: activeRes.count ?? 0,
      totalInactive: inactiveRes.count ?? 0,
      newThisWeek: weekRes.count ?? 0,
      newThisMonth: monthRes.count ?? 0,
    };
  } catch {
    return { totalActive: 0, totalInactive: 0, newThisWeek: 0, newThisMonth: 0 };
  }
}

async function getSubscribersByDay(): Promise<{ date: string; count: number }[]> {
  try {
    const supabase = getSupabaseClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data } = await supabase
      .from("subscribers")
      .select("subscribed_at")
      .eq("status", "active")
      .gte("subscribed_at", thirtyDaysAgo.toISOString());

    // Build a map of date -> count for last 30 days
    const countMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      countMap.set(key, 0);
    }

    if (data) {
      for (const row of data) {
        const key = new Date(row.subscribed_at).toISOString().split("T")[0];
        if (countMap.has(key)) {
          countMap.set(key, (countMap.get(key) ?? 0) + 1);
        }
      }
    }

    return Array.from(countMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));
  } catch {
    return [];
  }
}

async function getRecentSubscribers(): Promise<
  { id: string; email: string; status: string; subscribed_at: string }[]
> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from("subscribers")
      .select("id, email, status, subscribed_at")
      .order("subscribed_at", { ascending: false })
      .limit(20);

    return data ?? [];
  } catch {
    return [];
  }
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg bg-bg-low border border-border-ghost px-4 py-3">
      <p className="text-body-xs text-text-muted">{label}</p>
      <p
        className={
          accent
            ? "text-display-sm font-display text-accent mt-0.5"
            : "text-display-sm font-display text-foreground mt-0.5"
        }
      >
        {value}
      </p>
    </div>
  );
}

export default async function SubscribersPage() {
  const [stats, chartData, recentSubscribers] = await Promise.all([
    getSubscriberStats(),
    getSubscribersByDay(),
    getRecentSubscribers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-lg text-text-primary">
          Subscriber Management
        </h1>
        <p className="text-body-sm text-text-muted mt-1">
          Track subscriber growth and manage your audience.
        </p>
      </div>

      {/* Stats row */}
      <WidgetCard title="At a Glance">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Active" value={stats.totalActive} accent />
          <StatCard label="Total Inactive" value={stats.totalInactive} />
          <StatCard label="New This Week" value={stats.newThisWeek} />
          <StatCard label="New This Month" value={stats.newThisMonth} />
        </div>
      </WidgetCard>

      {/* Growth chart - 30 days */}
      <WidgetCard title="Subscriber Growth (30 Days)">
        <SubscriberChart data={chartData} />
      </WidgetCard>

      {/* Recent subscribers */}
      <WidgetCard title="Recent Subscribers">
        <SubscriberList subscribers={recentSubscribers} />
      </WidgetCard>
    </div>
  );
}
