"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OutreachTarget {
  id: string;
  site_url: string;
  site_name: string;
  contact_email: string;
  contact_name: string;
  broken_link_url: string;
  our_replacement_url: string;
  status: string;
}

interface OutreachTargetProps {
  campaignId: string;
  target?: OutreachTarget;
  onSaved: () => void;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  "discovered",
  "emailed",
  "replied",
  "won",
  "lost",
  "ignored",
];

type FormState = "idle" | "saving" | "success" | "error";

export function OutreachTargetDialog({
  campaignId,
  target,
  onSaved,
  onClose,
}: OutreachTargetProps) {
  const isEdit = !!target;

  const [siteUrl, setSiteUrl] = useState(target?.site_url ?? "");
  const [siteName, setSiteName] = useState(target?.site_name ?? "");
  const [contactEmail, setContactEmail] = useState(target?.contact_email ?? "");
  const [contactName, setContactName] = useState(target?.contact_name ?? "");
  const [brokenLinkUrl, setBrokenLinkUrl] = useState(target?.broken_link_url ?? "");
  const [ourReplacementUrl, setOurReplacementUrl] = useState(target?.our_replacement_url ?? "");
  const [status, setStatus] = useState(target?.status ?? "discovered");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!siteUrl.trim()) return;

    setFormState("saving");
    setErrorMsg("");

    const payload: Record<string, unknown> = {
      site_url: siteUrl,
      site_name: siteName,
      contact_email: contactEmail,
      contact_name: contactName,
      broken_link_url: brokenLinkUrl,
      our_replacement_url: ourReplacementUrl,
    };

    if (isEdit) {
      payload.id = target.id;
      payload.status = status;
    } else {
      payload.campaign_id = campaignId;
    }

    try {
      const res = await fetch("/api/outreach/targets", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      setFormState("success");
      setTimeout(() => {
        onSaved();
        onClose();
      }, 600);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setFormState("error");
    }
  }

  const isBusy = formState === "saving";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-bg-container border border-border-ghost rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-ghost">
          <h2 className="font-display text-display-sm text-text-primary">
            {isEdit ? "Edit Target" : "New Outreach Target"}
          </h2>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-body-xs font-medium text-text-muted block mb-1">
                Site URL *
              </span>
              <input
                type="url"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                required
                disabled={isBusy}
                placeholder="https://example.com/page"
                className={cn(
                  "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                  "text-body-sm text-text-primary placeholder:text-text-muted",
                  "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                  "disabled:opacity-50"
                )}
              />
            </label>
            <label className="block">
              <span className="text-body-xs font-medium text-text-muted block mb-1">
                Site Name
              </span>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                disabled={isBusy}
                placeholder="Example Blog"
                className={cn(
                  "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                  "text-body-sm text-text-primary placeholder:text-text-muted",
                  "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                  "disabled:opacity-50"
                )}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-body-xs font-medium text-text-muted block mb-1">
                Contact Email
              </span>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={isBusy}
                placeholder="editor@example.com"
                className={cn(
                  "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                  "text-body-sm text-text-primary placeholder:text-text-muted",
                  "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                  "disabled:opacity-50"
                )}
              />
            </label>
            <label className="block">
              <span className="text-body-xs font-medium text-text-muted block mb-1">
                Contact Name
              </span>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={isBusy}
                placeholder="John Doe"
                className={cn(
                  "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                  "text-body-sm text-text-primary placeholder:text-text-muted",
                  "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                  "disabled:opacity-50"
                )}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-body-xs font-medium text-text-muted block mb-1">
              Broken Link URL
            </span>
            <input
              type="url"
              value={brokenLinkUrl}
              onChange={(e) => setBrokenLinkUrl(e.target.value)}
              disabled={isBusy}
              placeholder="https://example.com/broken-page"
              className={cn(
                "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                "text-body-sm text-text-primary placeholder:text-text-muted",
                "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                "disabled:opacity-50"
              )}
            />
          </label>

          <label className="block">
            <span className="text-body-xs font-medium text-text-muted block mb-1">
              Our Replacement URL
            </span>
            <input
              type="url"
              value={ourReplacementUrl}
              onChange={(e) => setOurReplacementUrl(e.target.value)}
              disabled={isBusy}
              placeholder="https://theparticlepost.com/posts/our-article/"
              className={cn(
                "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                "text-body-sm text-text-primary placeholder:text-text-muted",
                "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                "disabled:opacity-50"
              )}
            />
          </label>

          {/* Status (edit only) */}
          {isEdit && (
            <label className="block">
              <span className="text-body-xs font-medium text-text-muted block mb-1">
                Status
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isBusy}
                className={cn(
                  "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                  "text-body-sm text-text-primary",
                  "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                  "disabled:opacity-50"
                )}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          )}

          {/* Status messages */}
          {formState === "error" && errorMsg && (
            <p className="text-body-xs text-[#ef4444]">{errorMsg}</p>
          )}
          {formState === "success" && (
            <p className="text-body-xs text-accent">
              {isEdit ? "Updated successfully." : "Target created."}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className={cn(
                "px-4 py-2 rounded-lg text-body-sm font-medium",
                "bg-bg-low text-text-secondary hover:text-text-primary hover:bg-bg-high",
                "transition-colors duration-[180ms] disabled:opacity-50"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy || !siteUrl.trim()}
              className={cn(
                "px-4 py-2 rounded-lg text-body-sm font-medium",
                "bg-accent text-white hover:bg-accent-hover",
                "transition-colors duration-[180ms] disabled:opacity-50"
              )}
            >
              {isBusy ? "Saving..." : isEdit ? "Update" : "Create Target"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
