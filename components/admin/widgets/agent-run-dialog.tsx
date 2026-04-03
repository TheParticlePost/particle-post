"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AgentRunDialogProps {
  workflow: string;
  label: string;
}

type RunState = "idle" | "loading" | "success" | "error";

export function AgentRunDialog({ workflow, label }: AgentRunDialogProps) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [state, setState] = useState<RunState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleRun = useCallback(async () => {
    if (state === "loading") return;
    setState("loading");
    setErrorMsg("");

    try {
      const inputs: Record<string, string> = {};
      if (topic.trim()) inputs.topic = topic.trim();
      if (dryRun) inputs.dry_run = "true";

      const resp = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow, inputs }),
      });

      if (resp.ok) {
        setState("success");
        setTimeout(() => {
          setState("idle");
          setOpen(false);
          setTopic("");
          setDryRun(false);
        }, 2000);
      } else {
        const data = await resp.json();
        setErrorMsg(data.error ?? "Unknown error");
        setState("error");
        setTimeout(() => setState("idle"), 4000);
      }
    } catch (err) {
      setErrorMsg(String(err));
      setState("error");
      setTimeout(() => setState("idle"), 4000);
    }
  }, [workflow, topic, dryRun, state]);

  return (
    <div className="relative" ref={dialogRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg",
          "text-body-xs font-medium",
          "transition-colors duration-[180ms]",
          "bg-accent/12 text-accent hover:bg-accent/20 border border-accent/20"
        )}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        {label}
      </button>

      {/* Popover */}
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 z-50",
            "w-72 rounded-lg",
            "bg-bg-container border border-border-ghost",
            "p-4 space-y-3"
          )}
        >
          <h4 className="text-body-sm font-display font-medium text-text-primary">
            Run {label}
          </h4>

          {/* Topic input */}
          <div className="space-y-1">
            <label className="text-body-xs text-text-muted">
              Topic <span className="text-text-muted/60">(optional)</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. AI in healthcare..."
              className={cn(
                "w-full px-3 py-1.5 rounded-lg text-body-sm",
                "bg-bg-low border border-border-ghost text-text-primary",
                "placeholder:text-text-muted/60",
                "focus:outline-none focus:border-accent/50",
                "transition-colors duration-[180ms]"
              )}
            />
          </div>

          {/* Dry run checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-accent bg-bg-low border-border-ghost"
            />
            <span className="text-body-xs text-text-secondary">Dry run</span>
          </label>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={state === "loading"}
            className={cn(
              "w-full px-4 py-1.5 rounded-lg text-body-sm font-medium",
              "transition-colors duration-[180ms]",
              state === "idle" && "bg-accent text-white hover:bg-accent/90",
              state === "loading" && "bg-accent/40 text-white/60 cursor-wait",
              state === "success" && "bg-accent/20 text-accent",
              state === "error" && "bg-red-500/20 text-red-400"
            )}
          >
            {state === "idle" && "Run"}
            {state === "loading" && "Triggering..."}
            {state === "success" && "Triggered!"}
            {state === "error" && "Failed"}
          </button>

          {/* Error message */}
          {state === "error" && errorMsg && (
            <p className="text-body-xs text-red-400 break-words">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}
