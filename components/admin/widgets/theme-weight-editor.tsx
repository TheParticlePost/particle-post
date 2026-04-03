"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { WidgetCard } from "@/components/admin/widget-card";

const CONFIG_PATH = "pipeline/config/content_strategy.json";

interface ThemeConfig {
  weight: number;
  pillars: string[];
  audience: string;
}

interface ThemeWeights {
  business: ThemeConfig;
  finance: ThemeConfig;
}

export function ThemeWeightEditor() {
  const [weights, setWeights] = useState<ThemeWeights | null>(null);
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
      setWeights(data.theme_weights ?? null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSlider = (theme: "business" | "finance", value: number) => {
    if (!weights) return;
    const clamped = Math.max(0, Math.min(100, value));
    const other = theme === "business" ? "finance" : "business";
    setWeights({
      ...weights,
      [theme]: { ...weights[theme], weight: clamped / 100 },
      [other]: { ...weights[other], weight: (100 - clamped) / 100 },
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!fullConfig || !weights) return;
    setSaving(true);
    setError("");
    try {
      const updated = { ...fullConfig, theme_weights: weights };
      const resp = await fetch(`/api/config/${CONFIG_PATH}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: updated,
          message: "dashboard: update theme weights",
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
      <WidgetCard title="Theme Weights">
        <div className="py-8 text-center">
          <p className="text-body-sm text-text-muted">Loading...</p>
        </div>
      </WidgetCard>
    );
  }

  if (!weights) {
    return (
      <WidgetCard title="Theme Weights">
        <div className="py-8 text-center">
          <p className="text-body-sm text-red-400">{error || "No data"}</p>
        </div>
      </WidgetCard>
    );
  }

  const businessPct = Math.round(weights.business.weight * 100);
  const financePct = 100 - businessPct;

  return (
    <WidgetCard title="Theme Weights">
      <div className="space-y-5">
        {/* Business slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium text-text-primary">
              Business
            </span>
            <span className="text-body-sm font-mono text-accent">
              {businessPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={businessPct}
            onChange={(e) => handleSlider("business", parseInt(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-bg-high accent-accent"
          />
          <div className="rounded-lg bg-bg-low border border-border-ghost px-3 py-2 space-y-1">
            <p className="text-body-xs text-text-muted">
              Pillars:{" "}
              <span className="text-text-secondary">
                {weights.business.pillars.join(", ")}
              </span>
            </p>
            <p className="text-body-xs text-text-muted">
              Audience:{" "}
              <span className="text-text-secondary">
                {weights.business.audience}
              </span>
            </p>
          </div>
        </div>

        {/* Finance slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium text-text-primary">
              Finance
            </span>
            <span className="text-body-sm font-mono text-accent">
              {financePct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={financePct}
            onChange={(e) => handleSlider("finance", parseInt(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-bg-high accent-accent"
          />
          <div className="rounded-lg bg-bg-low border border-border-ghost px-3 py-2 space-y-1">
            <p className="text-body-xs text-text-muted">
              Pillars:{" "}
              <span className="text-text-secondary">
                {weights.finance.pillars.join(", ")}
              </span>
            </p>
            <p className="text-body-xs text-text-muted">
              Audience:{" "}
              <span className="text-text-secondary">
                {weights.finance.audience}
              </span>
            </p>
          </div>
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
