"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface SeoConfig {
  keyword_targets: string[];
  content_gap_priorities: string[];
  avoid_cannibalization: string[];
  [key: string]: unknown;
}

interface MarketingConfig {
  current_plan: {
    target_keywords: string[];
    long_tail_keywords: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

type LoadState = "loading" | "loaded" | "error";
type SaveState = "idle" | "saving" | "success" | "error";

function TagList({
  label,
  items,
  onRemove,
  onAdd,
  disabled,
  mono,
}: {
  label: string;
  items: string[];
  onRemove: (index: number) => void;
  onAdd: (value: string) => void;
  disabled: boolean;
  mono?: boolean;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const trimmed = input.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setInput("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider">
        {label}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 && (
          <span className="text-body-xs text-text-muted">No items</span>
        )}
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg",
              "bg-accent/10 text-accent text-body-xs border border-accent/20",
              "transition-colors duration-[180ms]",
              mono && "font-mono"
            )}
          >
            <span className="max-w-[280px] truncate">{item}</span>
            <button
              onClick={() => onRemove(i)}
              disabled={disabled}
              className="hover:text-[#ef4444] transition-colors duration-[180ms] disabled:opacity-50"
              aria-label={`Remove ${item}`}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Add keyword..."
          className={cn(
            "flex-1 rounded-lg bg-bg-high border border-border-ghost px-3 py-1.5",
            "text-body-sm text-text-primary placeholder:text-text-muted/50",
            "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
            "disabled:opacity-50",
            mono && "font-mono"
          )}
        />
        <button
          onClick={handleAdd}
          disabled={disabled || !input.trim()}
          className={cn(
            "px-3 py-1.5 rounded-lg text-body-sm",
            "bg-bg-high border border-border-ghost text-text-secondary",
            "hover:border-accent hover:text-accent",
            "transition-colors duration-[180ms] disabled:opacity-50"
          )}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function GapList({
  items,
  onRemove,
  onAdd,
  disabled,
}: {
  items: string[];
  onRemove: (index: number) => void;
  onAdd: (value: string) => void;
  disabled: boolean;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const trimmed = input.trim();
    if (trimmed) {
      onAdd(trimmed);
      setInput("");
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="text-body-xs text-text-muted font-medium uppercase tracking-wider">
        Content Gap Priorities
      </h3>
      <div className="space-y-2">
        {items.length === 0 && (
          <span className="text-body-xs text-text-muted">No items</span>
        )}
        {items.map((gap, i) => (
          <div
            key={i}
            className="flex items-start gap-2 p-3 bg-bg-low rounded-lg border border-border-ghost"
          >
            <span className="font-mono text-body-xs text-accent mt-0.5 shrink-0">
              {i + 1}
            </span>
            <p className="text-body-xs text-text-secondary flex-1">{gap}</p>
            <button
              onClick={() => onRemove(i)}
              disabled={disabled}
              className="text-text-muted hover:text-[#ef4444] transition-colors duration-[180ms] text-body-sm shrink-0 disabled:opacity-50"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          disabled={disabled}
          placeholder="Add content gap priority..."
          className={cn(
            "flex-1 rounded-lg bg-bg-high border border-border-ghost px-3 py-1.5",
            "text-body-sm text-text-primary placeholder:text-text-muted/50",
            "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
            "disabled:opacity-50"
          )}
        />
        <button
          onClick={handleAdd}
          disabled={disabled || !input.trim()}
          className={cn(
            "px-3 py-1.5 rounded-lg text-body-sm",
            "bg-bg-high border border-border-ghost text-text-secondary",
            "hover:border-accent hover:text-accent",
            "transition-colors duration-[180ms] disabled:opacity-50"
          )}
        >
          Add
        </button>
      </div>
    </div>
  );
}

export function KeywordTargetEditor() {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Full config objects (we read and merge back)
  const [seoConfig, setSeoConfig] = useState<SeoConfig | null>(null);
  const [marketingConfig, setMarketingConfig] = useState<MarketingConfig | null>(null);

  // Editable lists
  const [primaryKeywords, setPrimaryKeywords] = useState<string[]>([]);
  const [longTailKeywords, setLongTailKeywords] = useState<string[]>([]);
  const [contentGapPriorities, setContentGapPriorities] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    setLoadState("loading");
    try {
      const [seoRes, mktRes] = await Promise.all([
        fetch("/api/config/pipeline/config/seo_gso_config.json"),
        fetch("/api/config/pipeline/config/marketing_strategy.json"),
      ]);

      if (!seoRes.ok || !mktRes.ok) {
        throw new Error("Failed to load config files");
      }

      const seo: SeoConfig = await seoRes.json();
      const mkt: MarketingConfig = await mktRes.json();

      setSeoConfig(seo);
      setMarketingConfig(mkt);

      setPrimaryKeywords(mkt.current_plan?.target_keywords ?? []);
      setLongTailKeywords(mkt.current_plan?.long_tail_keywords ?? []);
      setContentGapPriorities(seo.content_gap_priorities ?? []);

      setLoadState("loaded");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSave() {
    if (!seoConfig || !marketingConfig) return;

    setSaveState("saving");
    setErrorMsg("");

    // Merge keyword_targets from primary + long-tail for the SEO config
    const mergedKeywords = [...new Set([...primaryKeywords, ...longTailKeywords])];

    const updatedSeo: SeoConfig = {
      ...seoConfig,
      keyword_targets: mergedKeywords,
      content_gap_priorities: contentGapPriorities,
    };

    const updatedMarketing: MarketingConfig = {
      ...marketingConfig,
      current_plan: {
        ...marketingConfig.current_plan,
        target_keywords: primaryKeywords,
        long_tail_keywords: longTailKeywords,
      },
    };

    try {
      const [seoRes, mktRes] = await Promise.all([
        fetch("/api/config/pipeline/config/seo_gso_config.json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: updatedSeo,
            message: "admin: update keyword targets",
          }),
        }),
        fetch("/api/config/pipeline/config/marketing_strategy.json", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: updatedMarketing,
            message: "admin: update marketing keywords",
          }),
        }),
      ]);

      if (!seoRes.ok) {
        const err = await seoRes.json();
        throw new Error(err.error || "Failed to save SEO config");
      }
      if (!mktRes.ok) {
        const err = await mktRes.json();
        throw new Error(err.error || "Failed to save marketing config");
      }

      setSeoConfig(updatedSeo);
      setMarketingConfig(updatedMarketing);

      setSaveState("success");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setSaveState("error");
    }
  }

  const isBusy = saveState === "saving";

  if (loadState === "loading") {
    return (
      <p className="text-body-sm text-text-muted animate-pulse py-4">
        Loading keyword data...
      </p>
    );
  }

  if (loadState === "error") {
    return (
      <div className="py-4 text-center space-y-2">
        <p className="text-body-sm text-[#ef4444]">{errorMsg}</p>
        <button
          onClick={loadData}
          className="text-body-xs text-accent hover:text-accent-hover transition-colors duration-[180ms]"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TagList
        label="Primary Keywords"
        items={primaryKeywords}
        onRemove={(i) =>
          setPrimaryKeywords((prev) => prev.filter((_, idx) => idx !== i))
        }
        onAdd={(v) => setPrimaryKeywords((prev) => [...prev, v])}
        disabled={isBusy}
      />

      <TagList
        label="Long-tail Keywords"
        items={longTailKeywords}
        onRemove={(i) =>
          setLongTailKeywords((prev) => prev.filter((_, idx) => idx !== i))
        }
        onAdd={(v) => setLongTailKeywords((prev) => [...prev, v])}
        disabled={isBusy}
      />

      <GapList
        items={contentGapPriorities}
        onRemove={(i) =>
          setContentGapPriorities((prev) => prev.filter((_, idx) => idx !== i))
        }
        onAdd={(v) => setContentGapPriorities((prev) => [...prev, v])}
        disabled={isBusy}
      />

      {/* Status */}
      {saveState === "error" && errorMsg && (
        <p className="text-body-xs text-[#ef4444]">{errorMsg}</p>
      )}
      {saveState === "success" && (
        <span className="text-body-xs text-accent">
          Saved and committed to GitHub
        </span>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isBusy}
          className={cn(
            "px-5 py-2 rounded-lg text-body-sm font-medium",
            "bg-accent text-white hover:bg-accent-hover",
            "transition-colors duration-[180ms] disabled:opacity-50"
          )}
        >
          {isBusy ? "Saving & Committing..." : "Save & Commit"}
        </button>
      </div>
    </div>
  );
}
