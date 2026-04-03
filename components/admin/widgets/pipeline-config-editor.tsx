"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { WidgetCard } from "@/components/admin/widget-card";

const CONFIG_PATH = "pipeline/config/content_strategy.json";

type FunnelKey = "TOF" | "MOF" | "BOF";

interface WordCount {
  min: number;
  max: number;
  target: number;
}

interface FunnelConfig {
  name: string;
  word_count: WordCount;
  [key: string]: unknown;
}

const FUNNEL_KEYS: FunnelKey[] = ["TOF", "MOF", "BOF"];

const FUNNEL_STYLES: Record<FunnelKey, { bg: string; text: string; border: string; label: string }> = {
  TOF: {
    bg: "bg-accent/12",
    text: "text-accent",
    border: "border-accent/30",
    label: "Top of Funnel",
  },
  MOF: {
    bg: "bg-blue-500/12",
    text: "text-blue-400",
    border: "border-blue-500/30",
    label: "Middle of Funnel",
  },
  BOF: {
    bg: "bg-purple-500/12",
    text: "text-purple-400",
    border: "border-purple-500/30",
    label: "Bottom of Funnel",
  },
};

export function PipelineConfigEditor() {
  const [funnels, setFunnels] = useState<Record<FunnelKey, FunnelConfig> | null>(null);
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
      setFunnels(data.funnel_types ?? null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateWordCount = (key: FunnelKey, field: keyof WordCount, value: number) => {
    if (!funnels) return;
    setFunnels({
      ...funnels,
      [key]: {
        ...funnels[key],
        word_count: {
          ...funnels[key].word_count,
          [field]: value,
        },
      },
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!fullConfig || !funnels) return;
    setSaving(true);
    setError("");
    try {
      const updated = { ...fullConfig, funnel_types: funnels };
      const resp = await fetch(`/api/config/${CONFIG_PATH}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: updated,
          message: "dashboard: update funnel word counts",
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
      <WidgetCard title="Funnel Word Counts">
        <div className="py-8 text-center">
          <p className="text-body-sm text-text-muted">Loading...</p>
        </div>
      </WidgetCard>
    );
  }

  if (!funnels) {
    return (
      <WidgetCard title="Funnel Word Counts">
        <div className="py-8 text-center">
          <p className="text-body-sm text-red-400">{error || "No data"}</p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="Funnel Word Counts">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {FUNNEL_KEYS.map((key) => {
            const funnel = funnels[key];
            const style = FUNNEL_STYLES[key];
            if (!funnel) return null;

            return (
              <div
                key={key}
                className={cn(
                  "rounded-lg border p-3 space-y-3",
                  "bg-bg-low",
                  style.border
                )}
              >
                {/* Header */}
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-md text-body-xs font-medium",
                      style.bg,
                      style.text
                    )}
                  >
                    {key}
                  </span>
                  <span className="text-body-xs text-text-muted truncate">
                    {style.label}
                  </span>
                </div>

                {/* Word count inputs */}
                {(["min", "target", "max"] as const).map((field) => (
                  <div key={field} className="flex items-center justify-between gap-2">
                    <label className="text-body-xs text-text-muted capitalize">
                      {field}
                    </label>
                    <input
                      type="number"
                      value={funnel.word_count[field]}
                      onChange={(e) =>
                        updateWordCount(key, field, parseInt(e.target.value) || 0)
                      }
                      min={0}
                      step={50}
                      className={cn(
                        "w-20 px-2 py-1 rounded-md text-body-xs font-mono text-right",
                        "bg-bg-high border border-border-ghost text-text-primary",
                        "focus:outline-none focus:border-accent/50",
                        "transition-colors duration-[180ms]"
                      )}
                    />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <p className="text-body-xs text-red-400">{error}</p>
        )}

        {/* Save */}
        <div className="flex items-center gap-3 pt-1">
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
