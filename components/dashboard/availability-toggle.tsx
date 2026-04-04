"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvailabilityToggleProps {
  initialAvailable: boolean;
}

export function AvailabilityToggle({
  initialAvailable,
}: AvailabilityToggleProps) {
  const [available, setAvailable] = useState(initialAvailable);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const newValue = !available;
    setAvailable(newValue); // optimistic
    setLoading(true);

    try {
      const res = await fetch("/api/dashboard/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: newValue }),
      });

      if (!res.ok) {
        setAvailable(!newValue); // revert
      }
    } catch {
      setAvailable(!newValue); // revert
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-3"
    >
      <div
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-200",
          available ? "bg-[#2D9B5A]" : "bg-bg-high"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-5 h-5 rounded-full bg-text-primary transition-transform duration-200",
            available ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </div>
      <span
        className={cn(
          "font-mono text-data tabular-nums",
          available ? "text-[#2D9B5A]" : "text-text-muted"
        )}
      >
        {available ? "Available" : "Unavailable"}
      </span>
    </button>
  );
}
