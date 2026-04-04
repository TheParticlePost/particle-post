"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FormState = "idle" | "loading" | "success" | "error";

interface SubscribeFormProps {
  compact?: boolean;
  className?: string;
}

export function SubscribeForm({ compact = false, className }: SubscribeFormProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setState("loading");
    try {
      const res = await fetch("/api/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setState("success");
        setMessage(data.message || "Successfully subscribed!");
        setEmail("");
      } else {
        setState("error");
        setMessage(data.error || "Something went wrong.");
      }
    } catch {
      setState("error");
      setMessage("Network error. Please try again.");
    }

    // Reset after delay
    setTimeout(() => {
      setState("idle");
      setMessage("");
    }, 5000);
  };

  if (state === "success") {
    return (
      <div className={cn("flex items-center gap-2 text-accent", className)}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-body-sm font-medium">{message}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative flex gap-2",
        compact ? "flex-row" : "flex-col sm:flex-row",
        className
      )}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        aria-label="Email address"
        required
        className={cn(
          "flex-1 px-4 py-2.5 rounded-lg bg-bg-high/50 border border-border-ghost",
          "text-body-sm text-text-primary placeholder:text-text-muted",
          "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
          "transition-all duration-200",
          compact ? "min-w-[180px]" : "min-w-[240px]"
        )}
        disabled={state === "loading"}
      />
      <Button
        type="submit"
        variant="primary"
        size="default"
        disabled={state === "loading"}
        className="shrink-0"
      >
        {state === "loading" ? "Subscribing..." : "Subscribe"}
      </Button>
      {state === "error" && message && (
        <p className="text-danger text-body-xs mt-1 sm:absolute sm:top-full sm:left-0 sm:mt-2">
          {message}
        </p>
      )}
    </form>
  );
}
