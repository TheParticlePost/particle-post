"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface QueryData {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SearchComparisonProps {
  googleQueries: QueryData[];
  bingQueries: QueryData[];
}

type Tab = "google" | "bing" | "combined";

export function SearchComparison({
  googleQueries,
  bingQueries,
}: SearchComparisonProps) {
  const [activeTab, setActiveTab] = useState<Tab>("combined");

  const combinedQueries = mergeQueries(googleQueries, bingQueries);

  const displayData =
    activeTab === "google"
      ? googleQueries
      : activeTab === "bing"
        ? bingQueries
        : combinedQueries;

  const tabs: { key: Tab; label: string }[] = [
    { key: "combined", label: "Combined" },
    { key: "google", label: "Google" },
    { key: "bing", label: "Bing" },
  ];

  const hasData = displayData.length > 0;

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg bg-bg-low w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-body-sm font-medium transition-colors duration-200",
              activeTab === tab.key
                ? "bg-accent/15 text-accent"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {hasData ? (
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-border-ghost">
                <th className="text-left py-2 pr-4 text-text-muted font-medium">
                  Query
                </th>
                <th className="text-right py-2 px-3 text-text-muted font-medium">
                  Clicks
                </th>
                <th className="text-right py-2 px-3 text-text-muted font-medium">
                  Impressions
                </th>
                <th className="text-right py-2 px-3 text-text-muted font-medium">
                  CTR
                </th>
                <th className="text-right py-2 pl-3 text-text-muted font-medium">
                  Position
                </th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, i) => (
                <tr
                  key={`${row.query}-${i}`}
                  className="border-b border-border-ghost last:border-0"
                >
                  <td className="py-2.5 pr-4 text-text-primary max-w-[240px] truncate">
                    {row.query}
                  </td>
                  <td className="py-2.5 px-3 text-right text-accent font-medium tabular-nums">
                    {row.clicks.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-secondary tabular-nums">
                    {row.impressions.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-secondary tabular-nums">
                    {(row.ctr * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 pl-3 text-right text-text-secondary tabular-nums">
                    {row.position.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-text-muted text-body-sm">
          <p>No search query data available yet.</p>
          <p className="mt-1 text-body-xs">
            Data will appear once Google Search Console and Bing Webmaster Tools
            begin reporting impressions.
          </p>
        </div>
      )}
    </div>
  );
}

function mergeQueries(
  google: QueryData[],
  bing: QueryData[]
): QueryData[] {
  const map = new Map<string, QueryData>();

  for (const q of google) {
    map.set(q.query, { ...q });
  }

  for (const q of bing) {
    const existing = map.get(q.query);
    if (existing) {
      const totalClicks = existing.clicks + q.clicks;
      const totalImpressions = existing.impressions + q.impressions;
      existing.clicks = totalClicks;
      existing.impressions = totalImpressions;
      existing.ctr =
        totalImpressions > 0 ? totalClicks / totalImpressions : 0;
      existing.position = (existing.position + q.position) / 2;
    } else {
      map.set(q.query, { ...q });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.clicks - a.clicks);
}
