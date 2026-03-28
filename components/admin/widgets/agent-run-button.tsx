"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface AgentRunButtonProps {
  workflow: string;
  inputs?: Record<string, string>;
}

const PlayIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const SpinnerIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
    <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
  </svg>
);

const CheckIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ErrorIcon = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

type RunState = "idle" | "loading" | "success" | "error";

export function AgentRunButton({ workflow, inputs }: AgentRunButtonProps) {
  const [state, setState] = useState<RunState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleRun = useCallback(async () => {
    if (state === "loading") return;
    setState("loading");
    setErrorMsg("");

    try {
      const resp = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow, inputs }),
      });

      if (resp.ok) {
        setState("success");
        setTimeout(() => setState("idle"), 3000);
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
  }, [workflow, inputs, state]);

  return (
    <div className="relative">
      <button
        onClick={handleRun}
        disabled={state === "loading"}
        title={
          state === "error"
            ? errorMsg
            : state === "success"
            ? "Triggered!"
            : "Run agent"
        }
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center transition-colors",
          state === "idle" &&
            "bg-transparent hover:bg-accent/12 text-foreground-muted hover:text-accent",
          state === "loading" && "bg-accent/12 text-accent cursor-wait",
          state === "success" && "bg-accent/20 text-accent",
          state === "error" && "bg-red-500/20 text-red-400"
        )}
      >
        {state === "idle" && PlayIcon}
        {state === "loading" && SpinnerIcon}
        {state === "success" && CheckIcon}
        {state === "error" && ErrorIcon}
      </button>
    </div>
  );
}
