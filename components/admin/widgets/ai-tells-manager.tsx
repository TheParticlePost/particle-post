"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { WidgetCard } from "@/components/admin/widget-card";

const CONFIG_PATH = "pipeline/config/content_strategy.json";

export function AiTellsManager() {
  const [tells, setTells] = useState<string[]>([]);
  const [fullConfig, setFullConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [newPhrase, setNewPhrase] = useState("");

  const fetchConfig = useCallback(async () => {
    try {
      const resp = await fetch(`/api/config/${CONFIG_PATH}`);
      if (!resp.ok) throw new Error("Failed to load config");
      const data = await resp.json();
      setFullConfig(data);
      setTells(data.ai_tells_to_avoid ?? []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const addPhrase = () => {
    const trimmed = newPhrase.trim();
    if (!trimmed) return;
    if (tells.includes(trimmed)) {
      setError("Phrase already exists");
      setTimeout(() => setError(""), 2000);
      return;
    }
    setTells((prev) => [...prev, trimmed]);
    setNewPhrase("");
    setSaved(false);
  };

  const removePhrase = (index: number) => {
    setTells((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addPhrase();
    }
  };

  const handleSave = async () => {
    if (!fullConfig) return;
    setSaving(true);
    setError("");
    try {
      const updated = { ...fullConfig, ai_tells_to_avoid: tells };
      const resp = await fetch(`/api/config/${CONFIG_PATH}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: updated,
          message: "dashboard: update AI tells blacklist",
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
      <WidgetCard title="AI Tells Blacklist">
        <div className="py-8 text-center">
          <p className="text-body-sm text-text-muted">Loading...</p>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title="AI Tells Blacklist">
      <div className="space-y-4">
        {/* Add input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newPhrase}
            onChange={(e) => setNewPhrase(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add phrase to avoid..."
            className={cn(
              "flex-1 px-3 py-1.5 rounded-lg text-body-sm",
              "bg-bg-low border border-border-ghost text-text-primary",
              "placeholder:text-text-muted/60",
              "focus:outline-none focus:border-accent/50",
              "transition-colors duration-[180ms]"
            )}
          />
          <button
            onClick={addPhrase}
            disabled={!newPhrase.trim()}
            className={cn(
              "px-3 py-1.5 rounded-lg text-body-sm font-medium",
              "transition-colors duration-[180ms]",
              newPhrase.trim()
                ? "bg-bg-high text-text-primary hover:text-accent border border-border-ghost"
                : "bg-bg-low text-text-muted border border-border-ghost cursor-not-allowed"
            )}
          >
            Add
          </button>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {tells.map((phrase, i) => (
            <span
              key={`${phrase}-${i}`}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-body-xs",
                "bg-accent/10 text-accent border border-accent/20"
              )}
            >
              {phrase}
              <button
                onClick={() => removePhrase(i)}
                className="text-accent/60 hover:text-accent transition-colors duration-[180ms] ml-0.5"
                aria-label={`Remove "${phrase}"`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>

        <p className="text-body-xs text-text-muted">
          {tells.length} phrase{tells.length !== 1 ? "s" : ""} blocked
        </p>

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
