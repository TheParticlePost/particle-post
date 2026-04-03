"use client";

import { useState } from "react";
import { toast } from "@/lib/toast";

export function QuickActions() {
  const [running, setRunning] = useState<string | null>(null);

  const runPipeline = async () => {
    setRunning("pipeline");
    try {
      const res = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: "morning-post.yml", inputs: {} }),
      });
      if (res.ok) toast.success("Pipeline triggered");
      else toast.error("Failed to trigger pipeline");
    } catch {
      toast.error("Failed to trigger pipeline");
    } finally {
      setRunning(null);
    }
  };

  const scanCompetitors = async () => {
    setRunning("scan");
    try {
      const res = await fetch("/api/competitors");
      if (!res.ok) throw new Error();
      const data = await res.json();
      const competitors = data.competitors || [];

      let scanned = 0;
      for (const c of competitors.slice(0, 5)) {
        await fetch("/api/competitors/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitorId: c.id }),
        });
        scanned++;
      }
      toast.success(`Scanned ${scanned} competitors`);
    } catch {
      toast.error("Competitor scan failed");
    } finally {
      setRunning(null);
    }
  };

  const exportSubscribers = async () => {
    setRunning("export");
    try {
      const res = await fetch("/api/subscribers/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "subscribers.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Subscribers exported");
      }
    } catch {
      toast.error("Export failed");
    } finally {
      setRunning(null);
    }
  };

  const actions = [
    {
      id: "pipeline",
      label: "Run Pipeline",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
      onClick: runPipeline,
    },
    {
      id: "scan",
      label: "Scan Competitors",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      onClick: scanCompetitors,
    },
    {
      id: "export",
      label: "Export Subscribers",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      onClick: exportSubscribers,
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          disabled={running !== null}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-bg-container border border-border-ghost text-body-sm text-text-secondary hover:border-accent hover:text-accent transition-colors duration-[180ms] disabled:opacity-50"
        >
          {running === action.id ? (
            <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          ) : (
            action.icon
          )}
          {action.label}
        </button>
      ))}
    </div>
  );
}
