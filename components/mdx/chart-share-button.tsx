"use client";

import { useState, useCallback } from "react";

interface ChartShareButtonProps {
  /** Stable chart id from the article assembler, e.g. "chart-1". Used to
   *  build the per-chart share URL so LinkedIn can surface a dynamic OG
   *  image of this specific chart. */
  chartId: string;
  /** Human-readable chart title, used as the share intent text fallback. */
  title?: string;
}

/**
 * LinkedIn + X share buttons for a published chart. Rendered as a small
 * icon row in the top-right corner of every BarChart / TimeSeriesChart
 * on the article page.
 *
 * The share URL is built client-side from `window.location.origin`,
 * `window.location.pathname`, and a `?chart=<chartId>` query param. When
 * LinkedIn or X crawls that URL, the article's generateMetadata() reads
 * the query param and swaps the `og:image` to a dynamic route that
 * renders JUST this chart as the preview card — so the graph is
 * "put forward" in the social share, not the article cover.
 *
 * All rendering is client-side because we need window.location. The
 * component intentionally does no other work on mount to keep the
 * article page's hydration cost minimal.
 */
export function ChartShareButton({ chartId, title }: ChartShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const buildShareUrl = useCallback((): string => {
    if (typeof window === "undefined") return "";
    const { origin, pathname } = window.location;
    // Preserve any trailing slash the Next.js trailingSlash config produces.
    const cleanPath = pathname.endsWith("/") ? pathname : pathname + "/";
    return `${origin}${cleanPath}?chart=${encodeURIComponent(chartId)}`;
  }, [chartId]);

  const shareText = title
    ? `${title} — via Particle Post`
    : "Chart via Particle Post";

  const openLinkedIn = useCallback(() => {
    const url = buildShareUrl();
    if (!url) return;
    const intent = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      url,
    )}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }, [buildShareUrl]);

  const openTwitter = useCallback(() => {
    const url = buildShareUrl();
    if (!url) return;
    const intent = `https://twitter.com/intent/tweet?url=${encodeURIComponent(
      url,
    )}&text=${encodeURIComponent(shareText)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }, [buildShareUrl, shareText]);

  const copyLink = useCallback(async () => {
    const url = buildShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API can fail on insecure origins or older browsers.
      // Fall back to prompting the user to copy manually.
      window.prompt("Copy this share link:", url);
    }
  }, [buildShareUrl]);

  return (
    <div
      aria-label="Share this chart"
      className="flex items-center gap-1"
    >
      <button
        type="button"
        onClick={openLinkedIn}
        title="Share on LinkedIn"
        aria-label="Share on LinkedIn"
        className="p-1.5 rounded hover:bg-bg-base text-text-muted hover:text-accent transition-colors duration-[180ms] ease-kinetic"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={openTwitter}
        title="Share on X"
        aria-label="Share on X"
        className="p-1.5 rounded hover:bg-bg-base text-text-muted hover:text-accent transition-colors duration-[180ms] ease-kinetic"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={copyLink}
        title={copied ? "Copied!" : "Copy share link"}
        aria-label={copied ? "Link copied" : "Copy share link"}
        className="p-1.5 rounded hover:bg-bg-base text-text-muted hover:text-accent transition-colors duration-[180ms] ease-kinetic"
      >
        {copied ? (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        )}
      </button>
    </div>
  );
}
