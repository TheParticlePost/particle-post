"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface EmailComposerProps {
  targetId: string;
  targetName: string;
  contactEmail: string;
  onSent: () => void;
  onClose: () => void;
}

type Step = "generate" | "edit" | "sent" | "error";

export function EmailComposer({
  targetId,
  targetName,
  contactEmail,
  onSent,
  onClose,
}: EmailComposerProps) {
  const [step, setStep] = useState<Step>("generate");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGenerate() {
    setGenerating(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/outreach/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }
      const data = await res.json();
      setSubject(data.subject);
      setBodyHtml(data.bodyHtml);
      setStep("edit");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStep("error");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    setSending(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, subject, bodyHtml }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Send failed");
      }
      setStep("sent");
      setTimeout(() => {
        onSent();
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-container border border-border-ghost rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-ghost">
          <div>
            <h2 className="font-display text-display-sm text-text-primary">
              Email Composer
            </h2>
            <p className="text-body-xs text-text-muted mt-0.5">
              To: {targetName}{" "}
              <span className="font-mono text-text-muted">&lt;{contactEmail}&gt;</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors duration-[180ms] p-1"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: Generate */}
          {step === "generate" && (
            <div className="py-8 text-center space-y-4">
              <p className="text-body-sm text-text-secondary">
                Generate an outreach email using AI based on the target's broken link data.
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className={cn(
                  "px-6 py-2.5 rounded-lg text-body-sm font-medium",
                  "bg-accent text-white hover:bg-accent-hover",
                  "transition-colors duration-[180ms] disabled:opacity-50"
                )}
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  "Generate Email"
                )}
              </button>
            </div>
          )}

          {/* Step 2: Edit */}
          {step === "edit" && (
            <>
              {/* Subject */}
              <label className="block">
                <span className="text-body-xs font-medium text-text-muted block mb-1">
                  Subject
                </span>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={sending}
                  className={cn(
                    "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                    "text-body-sm text-text-primary placeholder:text-text-muted",
                    "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                    "disabled:opacity-50"
                  )}
                />
              </label>

              {/* Body editor */}
              <label className="block">
                <span className="text-body-xs font-medium text-text-muted block mb-1">
                  Body (HTML)
                </span>
                <textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  disabled={sending}
                  rows={8}
                  className={cn(
                    "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                    "text-body-xs font-mono text-text-primary placeholder:text-text-muted",
                    "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                    "disabled:opacity-50 resize-y"
                  )}
                />
              </label>

              {/* Preview */}
              <div>
                <span className="text-body-xs font-medium text-text-muted block mb-1">
                  Preview
                </span>
                <div
                  className="rounded-lg bg-white p-4 text-sm text-gray-900 max-h-48 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              </div>

              {errorMsg && (
                <p className="text-body-xs text-[#ef4444]">{errorMsg}</p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating || sending}
                  className={cn(
                    "px-4 py-2 rounded-lg text-body-sm font-medium",
                    "bg-bg-low text-text-secondary hover:text-text-primary hover:bg-bg-high",
                    "transition-colors duration-[180ms] disabled:opacity-50"
                  )}
                >
                  {generating ? "Regenerating..." : "Regenerate"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    disabled={sending}
                    className={cn(
                      "px-4 py-2 rounded-lg text-body-sm font-medium",
                      "bg-bg-low text-text-secondary hover:text-text-primary hover:bg-bg-high",
                      "transition-colors duration-[180ms] disabled:opacity-50"
                    )}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !subject.trim() || !bodyHtml.trim()}
                    className={cn(
                      "px-4 py-2 rounded-lg text-body-sm font-medium",
                      "bg-accent text-white hover:bg-accent-hover",
                      "transition-colors duration-[180ms] disabled:opacity-50"
                    )}
                  >
                    {sending ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-75" />
                        </svg>
                        Sending...
                      </span>
                    ) : (
                      "Send Email"
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Success */}
          {step === "sent" && (
            <div className="py-8 text-center space-y-2">
              <svg
                className="mx-auto h-10 w-10 text-accent"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-body-sm text-text-primary">Email sent successfully.</p>
            </div>
          )}

          {/* Error from generation */}
          {step === "error" && (
            <div className="py-8 text-center space-y-3">
              <p className="text-body-sm text-[#ef4444]">{errorMsg}</p>
              <button
                onClick={() => setStep("generate")}
                className="text-body-xs text-accent hover:text-accent-hover transition-colors duration-[180ms]"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
