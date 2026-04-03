"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { WidgetCard } from "@/components/admin/widget-card";

const CONFIG_PATH = "pipeline/config/content_strategy.json";

interface ContentTypeConfig {
  name: string;
  target_share: number;
  description: string;
  subtypes?: string[];
  examples?: string[];
}

export function ContentMixEditor() {
  const [practical, setPractical] = useState<ContentTypeConfig | null>(null);
  const [news, setNews] = useState<ContentTypeConfig | null>(null);
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
      setPractical(data.content_types?.practical ?? null);
      setNews(data.content_types?.news ?? null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSlider = (value: number) => {
    if (!practical || !news) return;
    const clamped = Math.max(0, Math.min(100, value));
    setPractical({ ...practical, target_share: clamped / 100 });
    setNews({ ...news, target_share: (100 - clamped) / 100 });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!fullConfig || !practical || !news) return;
    setSaving(true);
    setError("");
    try {
      const updated = {
        ...fullConfig,
        content_types: {
          ...(fullConfig.content_types as Record<string, unknown>),
          practical,
          news,
        },
      };
      const resp = await fetch(`/api/config/${CONFIG_PATH}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: updated,
          message: "dashboard: update content mix ratio",
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
      <WidgetCard title="Content Mix">
        <div className="py-8 text-center">
          <p className="text-body-sm text-text-muted">Loading...</p>
        </div>
      </WidgetCard>
    );
  }

  if (!practical || !news) {
    return (
      <WidgetCard title="Content Mix">
        <div className="py-8 text-center">
          <p className="text-body-sm text-red-400">{error || "No data"}</p>
        </div>
      </WidgetCard>
    );
  }

  const practicalPct = Math.round(practical.target_share * 100);
  const newsPct = 100 - practicalPct;

  return (
    <WidgetCard title="Content Mix">
      <div className="space-y-5">
        {/* Practical slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium text-text-primary">
              Practical
            </span>
            <span className="text-body-sm font-mono text-accent">
              {practicalPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={practicalPct}
            onChange={(e) => handleSlider(parseInt(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-bg-high accent-accent"
          />
          <p className="text-body-xs text-text-muted">{practical.description}</p>
        </div>

        {/* News slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-medium text-text-primary">
              News
            </span>
            <span className="text-body-sm font-mono text-accent">
              {newsPct}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={newsPct}
            onChange={(e) => handleSlider(100 - parseInt(e.target.value))}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-bg-high accent-accent"
          />
          <p className="text-body-xs text-text-muted">{news.description}</p>
        </div>

        {/* Visual bar */}
        <div className="flex h-2 rounded-lg overflow-hidden">
          <div
            className="bg-accent transition-all duration-[180ms]"
            style={{ width: `${practicalPct}%` }}
          />
          <div
            className="bg-blue-500 transition-all duration-[180ms]"
            style={{ width: `${newsPct}%` }}
          />
        </div>
        <div className="flex justify-between text-body-xs text-text-muted">
          <span>Practical ({practicalPct}%)</span>
          <span>News ({newsPct}%)</span>
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
