"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ServiceStatus {
  name: string;
  status: "connected" | "error" | "unconfigured";
  latency?: number;
  detail?: string;
}

const STATUS_STYLES: Record<string, { dot: string; text: string }> = {
  connected: { dot: "bg-green-400", text: "text-green-400" },
  error: { dot: "bg-red-400", text: "text-red-400" },
  unconfigured: { dot: "bg-amber-400", text: "text-amber-400" },
};

export function IntegrationHealth() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/health");
      if (res.ok) {
        const data = await res.json();
        setServices(data.services || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-body-sm text-text-muted animate-pulse">
        Checking integrations...
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {services.map((s) => {
        const style = STATUS_STYLES[s.status] || STATUS_STYLES.error;
        return (
          <div
            key={s.name}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-low border border-border-ghost"
            title={s.detail || s.status}
          >
            <span
              className={cn("w-2 h-2 rounded-full shrink-0", style.dot)}
            />
            <span className="text-body-xs text-text-secondary">{s.name}</span>
            {s.latency !== undefined && (
              <span className="font-mono text-caption text-text-muted">
                {s.latency}ms
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
