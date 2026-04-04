"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DataText } from "@/components/ui/data-text";
import { TagBadge } from "@/components/specialists/tag-badge";
import { getCategoryLabel, getCategoryColor, getCountryLabel } from "@/lib/specialists/constants";
import type { Specialist } from "@/lib/specialists/types";
import { formatDateShort } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "#D4962A",
  approved: "#2D9B5A",
  rejected: "#D14040",
  suspended: "#6E6660",
};

export default function AdminSpecialistsPage() {
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchSpecialists = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/admin/specialists${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSpecialists(data.specialists);
    } catch (err) {
      console.error("Failed to load specialists:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSpecialists();
  }, [fetchSpecialists]);

  async function updateSpecialist(id: string, updates: Record<string, unknown>) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/specialists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Update failed");
      await fetchSpecialists();
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-display-sm text-text-primary">
          Specialists
        </h1>
        <DataText>{specialists.length} total</DataText>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {["", "pending", "approved", "rejected", "suspended"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors",
              statusFilter === s
                ? "bg-accent text-[#F5F0EB]"
                : "bg-bg-high text-text-secondary hover:text-text-primary"
            )}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-muted text-body-sm py-8 text-center">Loading...</p>
      ) : specialists.length === 0 ? (
        <p className="text-text-muted text-body-sm py-8 text-center">No specialists found.</p>
      ) : (
        <div className="space-y-3">
          {specialists.map((s) => (
            <div
              key={s.id}
              className="bg-bg-container border border-border-ghost rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display font-bold text-body-md text-text-primary">
                    {s.display_name}
                  </span>
                  <TagBadge
                    label={s.status}
                    color={STATUS_COLORS[s.status]}
                    size="sm"
                  />
                  {s.is_verified && (
                    <TagBadge label="Verified" color="#2D9B5A" size="sm" />
                  )}
                  {s.is_featured && (
                    <TagBadge label="Featured" color="#E8552E" size="sm" />
                  )}
                </div>
                <p className="text-body-sm text-text-secondary line-clamp-1">
                  {s.headline}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  {s.categories[0] && (
                    <TagBadge
                      label={getCategoryLabel(s.categories[0])}
                      color={getCategoryColor(s.categories[0])}
                      size="sm"
                    />
                  )}
                  <DataText>
                    {s.location_city}, {getCountryLabel(s.country_code)}
                  </DataText>
                  <DataText>{formatDateShort(s.created_at)}</DataText>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {s.status === "pending" && (
                  <>
                    <Button
                      variant="primary"
                      size="compact"
                      disabled={updating === s.id}
                      onClick={() => updateSpecialist(s.id, { status: "approved" })}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="compact"
                      disabled={updating === s.id}
                      onClick={() => updateSpecialist(s.id, { status: "rejected" })}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {s.status === "approved" && (
                  <>
                    <Button
                      variant={s.is_featured ? "secondary" : "ghost"}
                      size="compact"
                      disabled={updating === s.id}
                      onClick={() =>
                        updateSpecialist(s.id, { is_featured: !s.is_featured })
                      }
                    >
                      {s.is_featured ? "Unfeature" : "Feature"}
                    </Button>
                    <Button
                      variant={s.is_verified ? "secondary" : "ghost"}
                      size="compact"
                      disabled={updating === s.id}
                      onClick={() =>
                        updateSpecialist(s.id, { is_verified: !s.is_verified })
                      }
                    >
                      {s.is_verified ? "Unverify" : "Verify"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="compact"
                      disabled={updating === s.id}
                      onClick={() =>
                        updateSpecialist(s.id, { status: "suspended" })
                      }
                    >
                      Suspend
                    </Button>
                  </>
                )}
                {(s.status === "rejected" || s.status === "suspended") && (
                  <Button
                    variant="ghost"
                    size="compact"
                    disabled={updating === s.id}
                    onClick={() => updateSpecialist(s.id, { status: "approved" })}
                  >
                    Reinstate
                  </Button>
                )}
                <a
                  href={`/specialists/${s.slug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-body-sm text-accent hover:underline"
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
