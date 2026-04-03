"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EmailComposer } from "./email-composer";

interface Competitor {
  id: string;
  name: string;
  url: string;
}

interface BrokenLink {
  source_url: string;
  source_title: string;
  context: string | null;
  status: string;
}

interface ArticleMatch {
  slug: string;
  title: string;
  url: string;
  score: number;
  funnel_type: string;
}

interface CreatedTarget {
  id: string;
  site_url: string;
  site_name: string;
  contact_email: string;
  contact_name: string;
}

type ActiveStep = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = [
  "Select Competitor",
  "Scan for Broken Links",
  "Match Articles",
  "Create Target",
  "Send Email",
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isCompleted = step < current;
        return (
          <div key={step} className="flex items-center gap-1 flex-1">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-body-xs font-medium transition-colors duration-[180ms]",
                isActive
                  ? "bg-accent text-white"
                  : isCompleted
                    ? "bg-accent/20 text-accent"
                    : "bg-bg-low text-text-muted"
              )}
            >
              {isCompleted ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                step
              )}
            </div>
            {step < total && (
              <div
                className={cn(
                  "flex-1 h-px",
                  isCompleted ? "bg-accent/40" : "bg-border-ghost"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BrokenLinkPipeline() {
  const [activeStep, setActiveStep] = useState<ActiveStep>(1);

  // Step 1 state
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitor, setSelectedCompetitor] = useState("");
  const [loadingCompetitors, setLoadingCompetitors] = useState(true);

  // Step 2 state
  const [brokenLinks, setBrokenLinks] = useState<BrokenLink[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  // Step 3 state
  const [selectedLink, setSelectedLink] = useState<BrokenLink | null>(null);
  const [matches, setMatches] = useState<ArticleMatch[]>([]);
  const [matching, setMatching] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<ArticleMatch | null>(null);

  // Step 4 state
  const [targetFields, setTargetFields] = useState({
    site_url: "",
    site_name: "",
    contact_email: "",
    contact_name: "",
  });
  const [createdTarget, setCreatedTarget] = useState<CreatedTarget | null>(null);
  const [creatingTarget, setCreatingTarget] = useState(false);

  // Step 5 state
  const [showEmailComposer, setShowEmailComposer] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");

  // Load competitors
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/competitors");
        if (!res.ok) throw new Error("Failed to load competitors");
        const data = await res.json();
        setCompetitors(data.competitors || []);
      } catch {
        setErrorMsg("Could not load competitors");
      } finally {
        setLoadingCompetitors(false);
      }
    }
    load();
  }, []);

  async function handleScan() {
    if (!selectedCompetitor) return;
    setScanning(true);
    setErrorMsg("");
    setScanMessage("");
    try {
      const res = await fetch("/api/competitors/broken-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitorId: selectedCompetitor }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Scan failed");
      }
      const data = await res.json();
      if (data.brokenLinks === 0) {
        setScanMessage(data.message || "No broken links found");
        setBrokenLinks([]);
      } else {
        setBrokenLinks(data.links || []);
        setActiveStep(2);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  async function handleMatch(link: BrokenLink) {
    setSelectedLink(link);
    setMatching(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/outreach/match-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brokenLinkUrl: link.source_url,
          anchorText: link.source_title,
          pageTopic: link.context || "",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Matching failed");
      }
      const data = await res.json();
      setMatches(data.matches || []);
      setActiveStep(3);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setMatching(false);
    }
  }

  function handleSelectMatch(match: ArticleMatch) {
    setSelectedMatch(match);

    // Auto-populate target fields
    const comp = competitors.find((c) => c.id === selectedCompetitor);
    setTargetFields({
      site_url: selectedLink?.source_url || "",
      site_name: comp?.name || "",
      contact_email: "",
      contact_name: "",
    });
    setActiveStep(4);
  }

  async function handleCreateTarget() {
    if (!selectedMatch) return;
    setCreatingTarget(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/outreach/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...targetFields,
          broken_link_url: selectedLink?.source_url || "",
          our_replacement_url: selectedMatch.url,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create target");
      }
      const data = await res.json();
      setCreatedTarget(data.target);
      setActiveStep(5);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingTarget(false);
    }
  }

  return (
    <div className="space-y-4">
      <StepIndicator current={activeStep} total={5} />

      {errorMsg && (
        <p className="text-body-xs text-[#ef4444] bg-[rgba(239,68,68,0.08)] rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}

      {/* Step 1: Select Competitor */}
      <div
        className={cn(
          "rounded-lg border border-border-ghost overflow-hidden transition-colors duration-[180ms]",
          activeStep === 1 ? "bg-bg-low" : "bg-bg-container"
        )}
      >
        <button
          onClick={() => setActiveStep(1)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-body-sm font-medium text-text-primary">
            {STEP_LABELS[0]}
          </span>
          {selectedCompetitor && activeStep > 1 && (
            <span className="text-body-xs font-mono text-accent">
              {competitors.find((c) => c.id === selectedCompetitor)?.name}
            </span>
          )}
        </button>

        {activeStep === 1 && (
          <div className="px-4 pb-4 space-y-3">
            {loadingCompetitors ? (
              <p className="text-body-xs text-text-muted">Loading...</p>
            ) : competitors.length === 0 ? (
              <p className="text-body-xs text-text-muted">
                No competitors configured. Add competitors first.
              </p>
            ) : (
              <>
                <select
                  value={selectedCompetitor}
                  onChange={(e) => setSelectedCompetitor(e.target.value)}
                  className={cn(
                    "w-full rounded-lg bg-bg-container border border-border-ghost px-3 py-2",
                    "text-body-sm text-text-primary",
                    "focus:outline-none focus:border-accent transition-colors duration-[180ms]"
                  )}
                >
                  <option value="">Select a competitor...</option>
                  {competitors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.url})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleScan}
                  disabled={!selectedCompetitor || scanning}
                  className={cn(
                    "px-4 py-2 rounded-lg text-body-sm font-medium",
                    "bg-accent text-white hover:bg-accent-hover",
                    "transition-colors duration-[180ms] disabled:opacity-50"
                  )}
                >
                  {scanning ? "Scanning..." : "Scan for Broken Links"}
                </button>
                {scanMessage && (
                  <p className="text-body-xs text-text-muted">{scanMessage}</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Broken Links Results */}
      {brokenLinks.length > 0 && (
        <div
          className={cn(
            "rounded-lg border border-border-ghost overflow-hidden transition-colors duration-[180ms]",
            activeStep === 2 ? "bg-bg-low" : "bg-bg-container"
          )}
        >
          <button
            onClick={() => setActiveStep(2)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-body-sm font-medium text-text-primary">
              {STEP_LABELS[1]}
            </span>
            <span className="text-body-xs font-mono text-text-muted">
              {brokenLinks.length} found
            </span>
          </button>

          {activeStep === 2 && (
            <div className="px-4 pb-4 space-y-2">
              {brokenLinks.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-lg bg-bg-container border border-border-ghost px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body-xs font-medium text-text-primary truncate">
                      {link.source_title || link.source_url}
                    </p>
                    <p className="text-body-xs font-mono text-text-muted truncate">
                      {link.source_url}
                    </p>
                  </div>
                  <button
                    onClick={() => handleMatch(link)}
                    disabled={matching}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-body-xs font-medium shrink-0",
                      "bg-accent/12 text-accent hover:bg-accent/20",
                      "transition-colors duration-[180ms] disabled:opacity-50"
                    )}
                  >
                    {matching && selectedLink === link ? "Matching..." : "Match Article"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Article Matches */}
      {matches.length > 0 && activeStep >= 3 && (
        <div
          className={cn(
            "rounded-lg border border-border-ghost overflow-hidden transition-colors duration-[180ms]",
            activeStep === 3 ? "bg-bg-low" : "bg-bg-container"
          )}
        >
          <button
            onClick={() => setActiveStep(3)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-body-sm font-medium text-text-primary">
              {STEP_LABELS[2]}
            </span>
            {selectedMatch && activeStep > 3 && (
              <span className="text-body-xs font-mono text-accent truncate max-w-[200px]">
                {selectedMatch.title}
              </span>
            )}
          </button>

          {activeStep === 3 && (
            <div className="px-4 pb-4 space-y-2">
              <p className="text-body-xs text-text-muted mb-2">
                Top matches for: {selectedLink?.source_title || selectedLink?.source_url}
              </p>
              {matches.map((match) => (
                <div
                  key={match.slug}
                  className="flex items-center justify-between gap-3 rounded-lg bg-bg-container border border-border-ghost px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body-xs font-medium text-text-primary truncate">
                      {match.title}
                    </p>
                    <p className="text-body-xs font-mono text-text-muted">
                      Score: {match.score} | {match.funnel_type}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectMatch(match)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-body-xs font-medium shrink-0",
                      "bg-accent text-white hover:bg-accent-hover",
                      "transition-colors duration-[180ms]"
                    )}
                  >
                    Use This
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Create Target */}
      {activeStep >= 4 && selectedMatch && (
        <div
          className={cn(
            "rounded-lg border border-border-ghost overflow-hidden transition-colors duration-[180ms]",
            activeStep === 4 ? "bg-bg-low" : "bg-bg-container"
          )}
        >
          <button
            onClick={() => setActiveStep(4)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-body-sm font-medium text-text-primary">
              {STEP_LABELS[3]}
            </span>
            {createdTarget && activeStep > 4 && (
              <span className="text-body-xs text-accent">Created</span>
            )}
          </button>

          {activeStep === 4 && !createdTarget && (
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-body-xs text-text-muted block mb-1">Site URL</span>
                  <input
                    type="url"
                    value={targetFields.site_url}
                    onChange={(e) =>
                      setTargetFields((f) => ({ ...f, site_url: e.target.value }))
                    }
                    className={cn(
                      "w-full rounded-lg bg-bg-container border border-border-ghost px-3 py-2",
                      "text-body-xs text-text-primary",
                      "focus:outline-none focus:border-accent transition-colors duration-[180ms]"
                    )}
                  />
                </label>
                <label className="block">
                  <span className="text-body-xs text-text-muted block mb-1">Site Name</span>
                  <input
                    type="text"
                    value={targetFields.site_name}
                    onChange={(e) =>
                      setTargetFields((f) => ({ ...f, site_name: e.target.value }))
                    }
                    className={cn(
                      "w-full rounded-lg bg-bg-container border border-border-ghost px-3 py-2",
                      "text-body-xs text-text-primary",
                      "focus:outline-none focus:border-accent transition-colors duration-[180ms]"
                    )}
                  />
                </label>
                <label className="block">
                  <span className="text-body-xs text-text-muted block mb-1">Contact Email</span>
                  <input
                    type="email"
                    value={targetFields.contact_email}
                    onChange={(e) =>
                      setTargetFields((f) => ({ ...f, contact_email: e.target.value }))
                    }
                    className={cn(
                      "w-full rounded-lg bg-bg-container border border-border-ghost px-3 py-2",
                      "text-body-xs text-text-primary",
                      "focus:outline-none focus:border-accent transition-colors duration-[180ms]"
                    )}
                  />
                </label>
                <label className="block">
                  <span className="text-body-xs text-text-muted block mb-1">Contact Name</span>
                  <input
                    type="text"
                    value={targetFields.contact_name}
                    onChange={(e) =>
                      setTargetFields((f) => ({ ...f, contact_name: e.target.value }))
                    }
                    className={cn(
                      "w-full rounded-lg bg-bg-container border border-border-ghost px-3 py-2",
                      "text-body-xs text-text-primary",
                      "focus:outline-none focus:border-accent transition-colors duration-[180ms]"
                    )}
                  />
                </label>
              </div>

              <div className="rounded-lg bg-bg-container border border-border-ghost px-3 py-2">
                <p className="text-body-xs text-text-muted">
                  Broken Link: <span className="font-mono text-text-secondary">{selectedLink?.source_url}</span>
                </p>
                <p className="text-body-xs text-text-muted mt-1">
                  Replacement: <span className="font-mono text-accent">{selectedMatch.url}</span>
                </p>
              </div>

              <button
                onClick={handleCreateTarget}
                disabled={creatingTarget || !targetFields.site_url}
                className={cn(
                  "px-4 py-2 rounded-lg text-body-sm font-medium",
                  "bg-accent text-white hover:bg-accent-hover",
                  "transition-colors duration-[180ms] disabled:opacity-50"
                )}
              >
                {creatingTarget ? "Creating..." : "Create Target"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 5: Send Email */}
      {activeStep >= 5 && createdTarget && (
        <div className="rounded-lg border border-border-ghost bg-bg-low overflow-hidden">
          <div className="px-4 py-3">
            <span className="text-body-sm font-medium text-text-primary">
              {STEP_LABELS[4]}
            </span>
          </div>
          <div className="px-4 pb-4">
            {createdTarget.contact_email ? (
              <button
                onClick={() => setShowEmailComposer(true)}
                className={cn(
                  "px-4 py-2 rounded-lg text-body-sm font-medium",
                  "bg-accent text-white hover:bg-accent-hover",
                  "transition-colors duration-[180ms]"
                )}
              >
                Compose Email
              </button>
            ) : (
              <p className="text-body-xs text-text-muted">
                No contact email set. Add an email to the target before sending.
              </p>
            )}
          </div>
        </div>
      )}

      {showEmailComposer && createdTarget && (
        <EmailComposer
          targetId={createdTarget.id}
          targetName={createdTarget.contact_name || createdTarget.site_name || "Contact"}
          contactEmail={createdTarget.contact_email}
          onSent={() => setShowEmailComposer(false)}
          onClose={() => setShowEmailComposer(false)}
        />
      )}
    </div>
  );
}
