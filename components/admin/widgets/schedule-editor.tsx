"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { WidgetCard } from "@/components/admin/widget-card";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const FUNNELS = ["TOF", "MOF", "BOF"] as const;
const CONTENT_TYPES = ["practical", "news"] as const;

type Funnel = (typeof FUNNELS)[number];
type ContentType = (typeof CONTENT_TYPES)[number];

interface SlotConfig {
  funnel: Funnel;
  content_type: ContentType;
}

type Schedule = Record<string, { morning: SlotConfig; evening: SlotConfig }>;

const FUNNEL_COLORS: Record<Funnel, { bg: string; text: string; border: string }> = {
  TOF: { bg: "bg-accent/12", text: "text-accent", border: "border-accent/30" },
  MOF: { bg: "bg-blue-500/12", text: "text-blue-400", border: "border-blue-500/30" },
  BOF: { bg: "bg-purple-500/12", text: "text-purple-400", border: "border-purple-500/30" },
};

const CONFIG_PATH = "pipeline/config/content_strategy.json";

export function ScheduleEditor() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [fullConfig, setFullConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const fetchConfig = useCallback(async () => {
    try {
      const resp = await fetch(`/api/config/${CONFIG_PATH}`);
      if (!resp.ok) throw new Error("Failed to load config");
      const data = await resp.json();
      setFullConfig(data);
      setSchedule(data.schedule ?? {});
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateSlot = (
    day: string,
    slot: "morning" | "evening",
    field: "funnel" | "content_type",
    value: string
  ) => {
    if (!schedule) return;
    setSchedule((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [day]: {
          ...prev[day],
          [slot]: {
            ...prev[day][slot],
            [field]: value,
          },
        },
      };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!fullConfig || !schedule) return;
    setSaving(true);
    setError("");
    try {
      const updated = { ...fullConfig, schedule };
      const resp = await fetch(`/api/config/${CONFIG_PATH}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: updated,
          message: "dashboard: update weekly schedule",
        }),
      });
      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error ?? "Save failed");
      }
      setFullConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <WidgetCard title="Weekly Schedule">
        <div className="py-8 text-center">
          <p className="text-body-sm text-text-muted">Loading schedule...</p>
        </div>
      </WidgetCard>
    );
  }

  if (!schedule) {
    return (
      <WidgetCard title="Weekly Schedule">
        <div className="py-8 text-center">
          <p className="text-body-sm text-red-400">{error || "No schedule data"}</p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Weekly Schedule">
      <div className="space-y-4">
        {/* Header row */}
        <div className="grid grid-cols-[80px_1fr_1fr] gap-2 text-body-xs text-text-muted font-medium uppercase tracking-wider">
          <div />
          <div className="text-center">Morning</div>
          <div className="text-center">Evening</div>
        </div>

        {/* Day rows */}
        <div className="space-y-2">
          {DAYS.map((day) => {
            const daySchedule = schedule[day];
            if (!daySchedule) return null;

            return (
              <div
                key={day}
                className="grid grid-cols-[80px_1fr_1fr] gap-2 items-center"
              >
                <span className="text-body-xs font-mono text-text-secondary">
                  {day.slice(0, 3)}
                </span>
                {(["morning", "evening"] as const).map((slot) => {
                  const config = daySchedule[slot];
                  const funnelStyle = FUNNEL_COLORS[config.funnel];
                  return (
                    <div
                      key={slot}
                      className="flex items-center gap-1.5 rounded-lg bg-bg-low border border-border-ghost px-2 py-1.5"
                    >
                      <select
                        value={config.funnel}
                        onChange={(e) =>
                          updateSlot(day, slot, "funnel", e.target.value)
                        }
                        className={cn(
                          "text-body-xs font-medium rounded-md px-1.5 py-0.5 border",
                          "bg-transparent cursor-pointer appearance-none",
                          "transition-colors duration-[180ms]",
                          funnelStyle.bg,
                          funnelStyle.text,
                          funnelStyle.border
                        )}
                      >
                        {FUNNELS.map((f) => (
                          <option key={f} value={f} className="bg-bg-container text-text-primary">
                            {f}
                          </option>
                        ))}
                      </select>
                      <select
                        value={config.content_type}
                        onChange={(e) =>
                          updateSlot(day, slot, "content_type", e.target.value)
                        }
                        className={cn(
                          "text-body-xs rounded-md px-1.5 py-0.5",
                          "bg-transparent border border-border-ghost text-text-secondary",
                          "cursor-pointer appearance-none",
                          "transition-colors duration-[180ms]"
                        )}
                      >
                        {CONTENT_TYPES.map((ct) => (
                          <option key={ct} value={ct} className="bg-bg-container text-text-primary">
                            {ct}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <p className="text-body-xs text-red-400">{error}</p>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "px-4 py-1.5 rounded-lg text-body-sm font-medium",
              "transition-colors duration-[180ms]",
              saving
                ? "bg-accent/40 text-white/60 cursor-wait"
                : "bg-accent text-white hover:bg-accent/90"
            )}
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {saved && (
            <span className="text-body-xs text-accent font-medium">
              Saved ✓
            </span>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
