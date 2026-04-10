"use client";

import { useEffect, useState } from "react";

interface CostsSummary {
  total_runs: number;
  total_cost: number;
  anthropic_cost: number;
  gemini_cost: number;
  gemini_images: number;
  gemini_price_per_image: number;
  avg_cost_per_run: number;
}

interface DailyCost {
  date: string;
  runs: number;
  anthropic_cost: number;
  gemini_cost: number;
  gemini_images: number;
  estimated_cost: number;
}

interface CostsResponse {
  summary: CostsSummary;
  daily: DailyCost[];
}

function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatUsd4(n: number): string {
  return `$${n.toFixed(4)}`;
}

function formatDay(iso: string): string {
  if (!iso || iso === "unknown") return "—";
  const d = new Date(iso + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ApiCostsBreakdown() {
  const [data, setData] = useState<CostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/costs", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: CostsResponse) => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <p className="text-body-sm text-text-muted">Loading cost data…</p>
    );
  }
  if (error) {
    return (
      <p className="text-body-sm text-text-muted">
        Failed to load costs: {error}
      </p>
    );
  }
  if (!data || data.summary.total_runs === 0) {
    return (
      <p className="text-body-sm text-text-muted">
        No cost data yet. Costs are logged after each pipeline run.
      </p>
    );
  }

  const { summary, daily } = data;
  const recentDays = daily.slice(-7).reverse();

  return (
    <div className="space-y-6">
      {/* Top-line summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md bg-bg-low p-3 border border-border-ghost">
          <p className="font-mono text-caption text-text-muted uppercase tracking-widest">
            Total
          </p>
          <p className="font-display text-display-sm text-accent mt-1">
            {formatUsd(summary.total_cost)}
          </p>
          <p className="font-mono text-caption text-text-muted mt-1">
            {summary.total_runs} runs
          </p>
        </div>
        <div className="rounded-md bg-bg-low p-3 border border-border-ghost">
          <p className="font-mono text-caption text-text-muted uppercase tracking-widest">
            Anthropic
          </p>
          <p className="font-display text-display-sm text-text-primary mt-1">
            {formatUsd(summary.anthropic_cost)}
          </p>
          <p className="font-mono text-caption text-text-muted mt-1">
            Claude API
          </p>
        </div>
        <div className="rounded-md bg-bg-low p-3 border border-border-ghost">
          <p className="font-mono text-caption text-text-muted uppercase tracking-widest">
            Gemini
          </p>
          <p className="font-display text-display-sm text-text-primary mt-1">
            {formatUsd(summary.gemini_cost)}
          </p>
          <p className="font-mono text-caption text-text-muted mt-1">
            {summary.gemini_images} image
            {summary.gemini_images === 1 ? "" : "s"} ·{" "}
            {formatUsd4(summary.gemini_price_per_image)}/img
          </p>
        </div>
        <div className="rounded-md bg-bg-low p-3 border border-border-ghost">
          <p className="font-mono text-caption text-text-muted uppercase tracking-widest">
            Avg / Run
          </p>
          <p className="font-display text-display-sm text-text-primary mt-1">
            {formatUsd(summary.avg_cost_per_run)}
          </p>
          <p className="font-mono text-caption text-text-muted mt-1">
            Anthropic + Gemini
          </p>
        </div>
      </div>

      {/* Last 7 days breakdown */}
      <div>
        <p className="font-mono text-caption text-text-muted uppercase tracking-widest mb-2">
          Last 7 days
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border-ghost text-text-muted">
                <th className="text-left py-2 font-mono text-caption uppercase tracking-widest">
                  Date
                </th>
                <th className="text-right py-2 font-mono text-caption uppercase tracking-widest">
                  Runs
                </th>
                <th className="text-right py-2 font-mono text-caption uppercase tracking-widest">
                  Anthropic
                </th>
                <th className="text-right py-2 font-mono text-caption uppercase tracking-widest">
                  Gemini
                </th>
                <th className="text-right py-2 font-mono text-caption uppercase tracking-widest">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {recentDays.map((d) => (
                <tr
                  key={d.date}
                  className="border-b border-border-ghost/50"
                >
                  <td className="py-2 text-text-secondary font-mono">
                    {formatDay(d.date)}
                  </td>
                  <td className="py-2 text-right text-text-secondary font-mono">
                    {d.runs}
                  </td>
                  <td className="py-2 text-right text-text-secondary font-mono">
                    {formatUsd(d.anthropic_cost)}
                  </td>
                  <td className="py-2 text-right font-mono text-text-secondary">
                    {d.gemini_images > 0 ? (
                      <span className="text-accent">
                        {formatUsd(d.gemini_cost)}
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-text-primary font-mono font-medium">
                    {formatUsd(d.estimated_cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
