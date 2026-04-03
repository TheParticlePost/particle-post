"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface PostEditorProps {
  slug: string;
  onClose: () => void;
  onSaved: () => void;
}

interface PostData {
  slug: string;
  title: string;
  description: string;
  categories: string[];
  tags: string[];
  funnel_type: string;
  schema_type: string;
  draft: boolean;
  date: string;
  content: string;
}

type Status = "idle" | "loading" | "saving" | "deleting" | "confirm-delete" | "success" | "error";

const FUNNEL_OPTIONS = ["TOF", "MOF", "BOF"];
const SCHEMA_OPTIONS = ["Article", "FAQPage", "HowTo", "NewsArticle"];

export function PostEditorDialog({ slug, onClose, onSaved }: PostEditorProps) {
  const [data, setData] = useState<PostData | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // Editable fields
  const [title, setTitle] = useState("");
  const [categoriesStr, setCategoriesStr] = useState("");
  const [funnelType, setFunnelType] = useState("TOF");
  const [schemaType, setSchemaType] = useState("Article");
  const [draft, setDraft] = useState(false);

  const fetchPost = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/posts/${slug}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to load post");
      }
      const post: PostData = await res.json();
      setData(post);
      setTitle(post.title);
      setCategoriesStr(post.categories.join(", "));
      setFunnelType(post.funnel_type || "TOF");
      setSchemaType(post.schema_type || "Article");
      setDraft(post.draft);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }, [slug]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSave() {
    setStatus("saving");
    setErrorMsg("");
    try {
      const updates: Record<string, unknown> = {};
      if (title !== data?.title) updates.title = title;
      const newCats = categoriesStr
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      if (JSON.stringify(newCats) !== JSON.stringify(data?.categories)) {
        updates.categories = newCats;
      }
      if (funnelType !== data?.funnel_type) updates.funnel_type = funnelType;
      if (schemaType !== data?.schema_type) updates.schema_type = schemaType;
      if (draft !== data?.draft) updates.draft = draft;

      if (Object.keys(updates).length === 0) {
        setStatus("idle");
        return;
      }

      const res = await fetch(`/api/posts/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      setStatus("success");
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  async function handleDelete() {
    if (status !== "confirm-delete") {
      setStatus("confirm-delete");
      return;
    }

    setStatus("deleting");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/posts/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Delete failed");
      }
      setStatus("success");
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  const isLoading = status === "loading";
  const isBusy = status === "saving" || status === "deleting";

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
            Edit Post
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

        <div className="p-5 space-y-4">
          {isLoading && (
            <p className="text-body-sm text-text-muted py-8 text-center">
              Loading post data...
            </p>
          )}

          {status === "error" && !data && (
            <div className="py-8 text-center space-y-2">
              <p className="text-body-sm text-[#ef4444]">{errorMsg}</p>
              <button
                onClick={fetchPost}
                className="text-body-xs text-accent hover:text-accent-hover transition-colors duration-[180ms]"
              >
                Retry
              </button>
            </div>
          )}

          {data && status !== "loading" && (
            <>
              {/* Title */}
              <label className="block">
                <span className="text-body-xs font-medium text-text-muted block mb-1">
                  Title
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isBusy}
                  className={cn(
                    "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                    "text-body-sm text-text-primary placeholder:text-text-muted",
                    "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                    "disabled:opacity-50"
                  )}
                />
              </label>

              {/* Categories */}
              <label className="block">
                <span className="text-body-xs font-medium text-text-muted block mb-1">
                  Categories (comma-separated)
                </span>
                <input
                  type="text"
                  value={categoriesStr}
                  onChange={(e) => setCategoriesStr(e.target.value)}
                  disabled={isBusy}
                  className={cn(
                    "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                    "text-body-sm text-text-primary placeholder:text-text-muted",
                    "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                    "disabled:opacity-50"
                  )}
                  placeholder="AI Strategy, Implementation"
                />
              </label>

              {/* Row: Funnel + Schema */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-body-xs font-medium text-text-muted block mb-1">
                    Funnel Type
                  </span>
                  <select
                    value={funnelType}
                    onChange={(e) => setFunnelType(e.target.value)}
                    disabled={isBusy}
                    className={cn(
                      "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                      "text-body-sm text-text-primary",
                      "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                      "disabled:opacity-50"
                    )}
                  >
                    {FUNNEL_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-body-xs font-medium text-text-muted block mb-1">
                    Schema Type
                  </span>
                  <select
                    value={schemaType}
                    onChange={(e) => setSchemaType(e.target.value)}
                    disabled={isBusy}
                    className={cn(
                      "w-full rounded-lg bg-bg-low border border-border-ghost px-3 py-2",
                      "text-body-sm text-text-primary",
                      "focus:outline-none focus:border-accent transition-colors duration-[180ms]",
                      "disabled:opacity-50"
                    )}
                  >
                    {SCHEMA_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Draft toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft}
                  onChange={(e) => setDraft(e.target.checked)}
                  disabled={isBusy}
                  className="rounded border-border-ghost bg-bg-low text-accent focus:ring-accent focus:ring-offset-0"
                />
                <span className="text-body-sm text-text-primary">Draft</span>
              </label>

              {/* Read-only fields */}
              <div className="space-y-2 border-t border-border-ghost pt-4">
                <div>
                  <span className="text-body-xs font-medium text-text-muted block mb-0.5">
                    Date
                  </span>
                  <p className="text-body-sm font-mono text-text-secondary">
                    {data.date || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-body-xs font-medium text-text-muted block mb-0.5">
                    Content Preview
                  </span>
                  <pre className="text-body-xs font-mono text-text-muted bg-bg-low rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
                    {data.content || "(empty)"}
                  </pre>
                </div>
              </div>

              {/* Status messages */}
              {status === "error" && errorMsg && (
                <p className="text-body-xs text-[#ef4444]">{errorMsg}</p>
              )}
              {status === "success" && (
                <p className="text-body-xs text-accent">Saved successfully.</p>
              )}
              {status === "confirm-delete" && (
                <p className="text-body-xs text-[#ef4444]">
                  Are you sure? This will delete the post file and remove it from all indexes. Click Delete again to confirm.
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleDelete}
                  disabled={isBusy}
                  className={cn(
                    "px-4 py-2 rounded-lg text-body-sm font-medium transition-colors duration-[180ms]",
                    status === "confirm-delete"
                      ? "bg-[#ef4444] text-white hover:bg-[#dc2626]"
                      : "bg-bg-low text-[#ef4444] hover:bg-[rgba(239,68,68,0.12)]",
                    "disabled:opacity-50"
                  )}
                >
                  {status === "deleting"
                    ? "Deleting..."
                    : status === "confirm-delete"
                      ? "Confirm Delete"
                      : "Delete"}
                </button>

                <div className="flex items-center gap-2">
                  <button
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
                    onClick={handleSave}
                    disabled={isBusy}
                    className={cn(
                      "px-4 py-2 rounded-lg text-body-sm font-medium",
                      "bg-accent text-white hover:bg-accent-hover",
                      "transition-colors duration-[180ms] disabled:opacity-50"
                    )}
                  >
                    {status === "saving" ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
