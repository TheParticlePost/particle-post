"use client";

import { useState, useEffect } from "react";
import { subscribe, toast as toastApi, type Toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const TYPE_STYLES: Record<string, string> = {
  success: "border-green-500/40 bg-green-500/10 text-green-400",
  error: "border-red-500/40 bg-red-500/10 text-red-400",
  info: "border-accent/40 bg-accent/10 text-accent",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-400",
};

const TYPE_ICONS: Record<string, string> = {
  success: "✓",
  error: "✗",
  info: "i",
  warning: "!",
};

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-sm",
            "animate-in slide-in-from-right-5 fade-in duration-200",
            TYPE_STYLES[t.type] || TYPE_STYLES.info
          )}
        >
          <span className="font-mono text-body-sm font-bold shrink-0 mt-0.5">
            {TYPE_ICONS[t.type]}
          </span>
          <p className="text-body-sm flex-1">{t.message}</p>
          <button
            onClick={() => toastApi.dismiss(t.id)}
            className="text-body-sm opacity-60 hover:opacity-100 transition-opacity shrink-0"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
