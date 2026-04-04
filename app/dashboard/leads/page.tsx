"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { LeadCard } from "@/components/dashboard/lead-card";
import { DataText } from "@/components/ui/data-text";
import { Button } from "@/components/ui/button";
import type { SpecialistLead } from "@/lib/specialists/types";

const STATUSES = ["all", "new", "viewed", "responded", "archived"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<SpecialistLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchLeads = useCallback(
    async (pageNum: number, append = false) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "20",
        });
        if (status !== "all") params.set("status", status);

        const res = await fetch(`/api/dashboard/leads?${params}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setLeads((prev) => (append ? [...prev, ...data.leads] : data.leads));
        setTotal(data.total);
      } catch (err) {
        console.error("Failed to load leads:", err);
      } finally {
        setLoading(false);
      }
    },
    [status]
  );

  useEffect(() => {
    setPage(1);
    fetchLeads(1);
  }, [fetchLeads]);

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/dashboard/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Update failed");
      // Refresh current page
      fetchLeads(1);
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setUpdating(null);
    }
  }

  const hasMore = leads.length < total;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-display-sm text-text-primary">
          Lead Inbox
        </h1>
        <DataText>{total} total</DataText>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-body-sm font-medium transition-colors capitalize",
              status === s
                ? "bg-accent text-[#F5F0EB]"
                : "bg-bg-high text-text-secondary hover:text-text-primary"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Lead list */}
      {loading && leads.length === 0 ? (
        <p className="text-text-muted text-body-sm py-8 text-center">Loading...</p>
      ) : leads.length === 0 ? (
        <p className="text-text-muted text-body-sm py-8 text-center">
          No leads found.
        </p>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onStatusChange={handleStatusChange}
              updating={updating === lead.id}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => {
              const next = page + 1;
              setPage(next);
              fetchLeads(next, true);
            }}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
