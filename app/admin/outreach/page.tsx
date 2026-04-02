"use client";

import { useState, useEffect, useCallback } from "react";
import { WidgetCard } from "@/components/admin/widget-card";

interface OutreachTarget {
  id: string;
  site_url: string;
  site_name: string | null;
  contact_email: string | null;
  contact_name: string | null;
  broken_link_url: string | null;
  our_replacement_url: string | null;
  status: string;
  created_at: string;
}

interface OutreachEmail {
  id: string;
  target_id: string;
  sequence_step: number;
  subject: string;
  sent_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  created_at: string;
  targets: OutreachTarget[];
  emails: OutreachEmail[];
}

const STATUS_COLORS: Record<string, string> = {
  discovered: "text-text-muted",
  emailed: "text-blue-400",
  followed_up: "text-yellow-400",
  replied: "text-accent",
  won: "text-green-400",
  lost: "text-red-400",
  ignored: "text-text-muted",
};

export default function OutreachPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/outreach/campaigns");
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate funnel stats
  const allTargets = campaigns.flatMap((c) => c.targets);
  const stats = {
    total: allTargets.length,
    discovered: allTargets.filter((t) => t.status === "discovered").length,
    emailed: allTargets.filter((t) =>
      ["emailed", "followed_up"].includes(t.status)
    ).length,
    replied: allTargets.filter((t) => t.status === "replied").length,
    won: allTargets.filter((t) => t.status === "won").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-display-lg text-text-primary">
          Outreach Pipeline
        </h1>
        <p className="text-body-md text-text-muted mt-1">
          Automated backlink outreach — discover, email, track, win
        </p>
      </div>

      {/* Funnel overview */}
      <WidgetCard title="Pipeline Funnel">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Discovered", value: stats.discovered, color: "text-text-muted" },
            { label: "Emailed", value: stats.emailed, color: "text-blue-400" },
            { label: "Replied", value: stats.replied, color: "text-accent" },
            { label: "Won", value: stats.won, color: "text-green-400" },
          ].map((s) => (
            <div key={s.label} className="bg-bg-low rounded-lg p-4 text-center">
              <p className="font-mono text-caption text-text-muted uppercase tracking-widest mb-1">
                {s.label}
              </p>
              <p className={`font-display text-display-md ${s.color}`}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      </WidgetCard>

      {/* Campaigns */}
      {loading ? (
        <WidgetCard title="Loading...">
          <p className="text-body-sm text-text-muted py-4 animate-pulse">
            Loading campaigns...
          </p>
        </WidgetCard>
      ) : campaigns.length === 0 ? (
        <WidgetCard title="No Campaigns">
          <div className="py-8 text-center">
            <p className="text-body-md text-text-muted mb-2">
              No outreach campaigns yet.
            </p>
            <p className="text-body-sm text-text-muted">
              Campaigns are auto-created when the competitor broken link finder
              discovers opportunities.
            </p>
          </div>
        </WidgetCard>
      ) : (
        campaigns.map((campaign) => (
          <WidgetCard
            key={campaign.id}
            title={campaign.name}
            action={{
              label: campaign.status,
              href: "#",
            }}
          >
            <div className="space-y-2">
              {campaign.targets.map((target) => (
                <div
                  key={target.id}
                  className="flex items-center justify-between p-3 bg-bg-low rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body-sm text-text-body truncate">
                      {target.site_name || target.site_url}
                    </p>
                    {target.contact_email && (
                      <p className="text-body-xs text-text-muted">
                        {target.contact_email}
                      </p>
                    )}
                  </div>
                  <span
                    className={`font-mono text-caption uppercase ${
                      STATUS_COLORS[target.status] || "text-text-muted"
                    }`}
                  >
                    {target.status}
                  </span>
                </div>
              ))}
            </div>
          </WidgetCard>
        ))
      )}
    </div>
  );
}
