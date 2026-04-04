"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { WidgetCard } from "@/components/admin/widget-card";
import { StatCard } from "@/components/ui/stat-card";

interface AnalyticsData {
  period: string;
  views: { date: string; count: number }[];
  leads: { date: string; count: number }[];
  statusBreakdown: Record<string, number>;
  totals: { views: number; leads: number };
}

const PERIODS = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState("30d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/dashboard/analytics?period=${period}`);
        if (!res.ok) throw new Error("Failed to load");
        setData(await res.json());
      } catch (err) {
        console.error("Analytics load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-display-sm text-text-primary">
          Analytics
        </h1>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors",
                period === p.value
                  ? "bg-accent text-[#F5F0EB]"
                  : "bg-bg-high text-text-secondary hover:text-text-primary"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-text-muted text-body-sm py-8 text-center">Loading...</p>
      ) : data ? (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Profile Views" value={data.totals.views} />
            <StatCard label="Leads Received" value={data.totals.leads} accent={data.totals.leads > 0} />
          </div>

          {/* Views chart */}
          <WidgetCard title="Profile Views">
            <MiniBarChart data={data.views} color="var(--text-secondary)" />
          </WidgetCard>

          {/* Leads chart */}
          <WidgetCard title="Leads Over Time">
            <MiniBarChart data={data.leads} color="#E8552E" />
          </WidgetCard>

          {/* Status breakdown */}
          {Object.keys(data.statusBreakdown).length > 0 && (
            <WidgetCard title="Lead Status Breakdown">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(data.statusBreakdown).map(([status, count]) => (
                  <div
                    key={status}
                    className="bg-bg-low rounded-lg p-3 text-center"
                  >
                    <p className="font-mono text-display-sm tabular-nums text-text-primary">
                      {count}
                    </p>
                    <p className="text-caption text-text-muted capitalize mt-1">
                      {status}
                    </p>
                  </div>
                ))}
              </div>
            </WidgetCard>
          )}
        </>
      ) : (
        <p className="text-text-muted text-body-sm py-8 text-center">
          Failed to load analytics.
        </p>
      )}
    </div>
  );
}

function MiniBarChart({
  data,
  color,
}: {
  data: { date: string; count: number }[];
  color: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-px h-24">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex-1 min-w-0 rounded-t"
          style={{
            height: `${(d.count / max) * 100}%`,
            backgroundColor: d.count > 0 ? color : "var(--bg-high)",
            minHeight: "2px",
          }}
          title={`${d.date}: ${d.count}`}
        />
      ))}
    </div>
  );
}
