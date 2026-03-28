"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

type DialogState = "closed" | "open" | "loading" | "success" | "error";

export function HumanPostDialog() {
  const [state, setState] = useState<DialogState>("closed");
  const [errorMsg, setErrorMsg] = useState("");
  const [topic, setTopic] = useState("");
  const [sources, setSources] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [slot, setSlot] = useState<"morning" | "evening">("morning");

  const handleSubmit = useCallback(async () => {
    if (!topic.trim()) return;
    setState("loading");
    setErrorMsg("");

    try {
      const resp = await fetch("/api/agents/human-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          sources: sources.trim(),
          keyPoints: keyPoints.trim(),
          slot,
        }),
      });

      if (resp.ok) {
        setState("success");
        setTimeout(() => {
          setState("closed");
          setTopic("");
          setSources("");
          setKeyPoints("");
        }, 3000);
      } else {
        const data = await resp.json();
        setErrorMsg(data.error ?? "Unknown error");
        setState("error");
      }
    } catch (err) {
      setErrorMsg(String(err));
      setState("error");
    }
  }, [topic, sources, keyPoints, slot]);

  if (state === "closed") {
    return (
      <button
        onClick={() => setState("open")}
        className="px-4 py-2 rounded-lg bg-accent text-black text-body-sm font-medium hover:bg-accent/90 transition-colors"
      >
        + Human-Assisted Post
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={() => state !== "loading" && setState("closed")}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-lg bg-bg-low border border-border-ghost p-6">
          <h2 className="font-display text-display-sm text-text-primary mb-4">
            New Human-Assisted Post
          </h2>
          <p className="text-body-xs text-text-muted mb-5">
            Provide topic direction and sources. AI handles writing, SEO, and
            formatting. A pull request is created for your review before publishing.
          </p>

          <div className="space-y-4">
            {/* Topic */}
            <div>
              <label className="block text-body-xs font-medium text-text-secondary mb-1">
                Topic *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., AI-powered fraud detection in cross-border payments"
                className="w-full px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent"
              />
            </div>

            {/* Sources */}
            <div>
              <label className="block text-body-xs font-medium text-text-secondary mb-1">
                Sources / URLs
              </label>
              <textarea
                value={sources}
                onChange={(e) => setSources(e.target.value)}
                placeholder={"One URL per line:\nhttps://example.com/article-1\nhttps://example.com/report-2"}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {/* Key Points */}
            <div>
              <label className="block text-body-xs font-medium text-text-secondary mb-1">
                Key Points / Direction
              </label>
              <textarea
                value={keyPoints}
                onChange={(e) => setKeyPoints(e.target.value)}
                placeholder={"One point per line:\nFocus on ROI data for enterprise CFOs\nInclude comparison with manual processes"}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-bg-high border border-border-ghost text-body-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:border-accent resize-none"
              />
            </div>

            {/* Slot */}
            <div>
              <label className="block text-body-xs font-medium text-text-secondary mb-1">
                Slot
              </label>
              <div className="flex gap-3">
                {(["morning", "evening"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSlot(s)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-body-sm font-medium capitalize transition-colors",
                      slot === s
                        ? "bg-accent/20 text-accent border border-accent/40"
                        : "bg-bg-high text-text-muted border border-border-ghost hover:border-border-hover"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error message */}
          {state === "error" && (
            <p className="text-body-xs text-red-400 mt-3">{errorMsg}</p>
          )}

          {/* Success message */}
          {state === "success" && (
            <p className="text-body-xs text-accent mt-3">
              Workflow triggered! A PR will be created for your review.
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setState("closed")}
              disabled={state === "loading"}
              className="px-4 py-2 rounded-lg text-body-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={state === "loading" || state === "success" || !topic.trim()}
              className={cn(
                "px-5 py-2 rounded-lg text-body-sm font-medium transition-colors",
                state === "loading"
                  ? "bg-accent/50 text-black/50 cursor-wait"
                  : "bg-accent text-black hover:bg-accent/90",
                !topic.trim() && "opacity-50 cursor-not-allowed"
              )}
            >
              {state === "loading" ? "Triggering..." : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
