"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  { keys: ["Cmd", "K"], description: "Search", action: "search" },
  { keys: ["g", "o"], description: "Go to Overview", href: "/admin" },
  { keys: ["g", "p"], description: "Go to Pipeline", href: "/admin/pipeline" },
  { keys: ["g", "s"], description: "Go to Strategy", href: "/admin/strategy" },
  { keys: ["g", "a"], description: "Go to Analytics", href: "/admin/analytics" },
  { keys: ["g", "e"], description: "Go to SEO", href: "/admin/seo" },
  { keys: ["g", "c"], description: "Go to Competitors", href: "/admin/competitors" },
  { keys: ["g", "r"], description: "Go to Outreach", href: "/admin/outreach" },
  { keys: ["g", "f"], description: "Go to Affiliates", href: "/admin/affiliates" },
  { keys: ["?"], description: "Show shortcuts", action: "help" },
];

export function KeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const [pendingG, setPendingG] = useState(false);
  const router = useRouter();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger in inputs/textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // CMD+K handled by command palette
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        return; // Let command palette handle this
      }

      // ? = show help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }

      // Escape = close help
      if (e.key === "Escape") {
        setShowHelp(false);
        setPendingG(false);
        return;
      }

      // "g" prefix for navigation
      if (e.key === "g" && !pendingG && !e.metaKey && !e.ctrlKey) {
        setPendingG(true);
        // Auto-cancel after 1 second
        setTimeout(() => setPendingG(false), 1000);
        return;
      }

      if (pendingG) {
        setPendingG(false);
        const shortcut = SHORTCUTS.find(
          (s) => s.keys[0] === "g" && s.keys[1] === e.key
        );
        if (shortcut?.href) {
          e.preventDefault();
          router.push(shortcut.href);
        }
      }
    },
    [pendingG, router]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  if (!showHelp) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50"
        onClick={() => setShowHelp(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-bg-container border border-border-ghost rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-display-sm text-text-primary">
              Keyboard Shortcuts
            </h2>
            <button
              onClick={() => setShowHelp(false)}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              &times;
            </button>
          </div>

          <div className="space-y-2">
            {SHORTCUTS.map((s, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-border-ghost/50 last:border-0"
              >
                <span className="text-body-sm text-text-secondary">
                  {s.description}
                </span>
                <div className="flex items-center gap-1">
                  {s.keys.map((key, j) => (
                    <span key={j}>
                      {j > 0 && (
                        <span className="text-text-muted mx-0.5">+</span>
                      )}
                      <kbd
                        className={cn(
                          "inline-block px-2 py-0.5 rounded",
                          "bg-bg-low border border-border-ghost",
                          "font-mono text-caption text-text-primary"
                        )}
                      >
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-body-xs text-text-muted mt-4 text-center">
            Press <kbd className="px-1.5 py-0.5 rounded bg-bg-low border border-border-ghost font-mono text-caption">?</kbd> to toggle this menu
          </p>
        </div>
      </div>
    </>
  );
}
