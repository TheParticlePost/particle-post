"use client";

import { useState, useEffect } from "react";
import { WidgetCard } from "@/components/admin/widget-card";
import { StatCard } from "@/components/ui/stat-card";
import { LeadCard } from "@/components/dashboard/lead-card";
import { AvailabilityToggle } from "@/components/dashboard/availability-toggle";
import { TagBadge } from "@/components/specialists/tag-badge";
import type { DashboardStats, SpecialistLead } from "@/lib/specialists/types";

interface DashboardData {
  stats: DashboardStats;
  recentLeads: SpecialistLead[];
  specialist: {
    display_name: string;
    slug: string;
    is_available: boolean;
    is_verified: boolean;
    is_featured: boolean;
    status: string;
  };
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) throw new Error("Failed to load");
        setData(await res.json());
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-text-muted text-body-sm py-8 text-center">Loading dashboard...</p>;
  }

  if (!data) {
    return <p className="text-text-muted text-body-sm py-8 text-center">Failed to load dashboard.</p>;
  }

  const { stats, recentLeads, specialist } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-display-sm text-text-primary">
            Welcome back, {specialist.display_name.split(" ")[0]}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {specialist.is_verified && (
              <TagBadge label="Verified" color="#2D9B5A" size="sm" />
            )}
            {specialist.is_featured && (
              <TagBadge label="Featured" color="#E8552E" size="sm" />
            )}
          </div>
        </div>
        <AvailabilityToggle initialAvailable={specialist.is_available} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Leads" value={stats.totalLeads} />
        <StatCard label="New Leads" value={stats.newLeads} accent={stats.newLeads > 0} />
        <StatCard label="Profile Views" value={stats.profileViews} />
        <StatCard
          label="Response Rate"
          value={`${stats.responseRate}%`}
          subtitle={`${stats.totalReviews} reviews · ${stats.avgRating.toFixed(1)} avg`}
        />
      </div>

      {/* Recent leads */}
      <WidgetCard
        title="Recent Leads"
        action={{ label: "View all", href: "/dashboard/leads" }}
      >
        {recentLeads.length === 0 ? (
          <p className="text-text-muted text-body-sm py-4 text-center">
            No leads yet. Share your profile to start receiving inquiries.
          </p>
        ) : (
          <div className="space-y-3">
            {recentLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={async (id, status) => {
                  await fetch(`/api/dashboard/leads/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status }),
                  });
                  // Refresh
                  const res = await fetch("/api/dashboard");
                  if (res.ok) setData(await res.json());
                }}
              />
            ))}
          </div>
        )}
      </WidgetCard>
    </div>
  );
}
