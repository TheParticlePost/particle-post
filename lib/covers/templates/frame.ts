/**
 * Shared brand frame: accent stripe, category tag, wordmark, date.
 * Every mode wraps its content in this frame.
 */

import { CoverConfig } from "../types";
import { formatCoverDate } from "../brand";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface FrameParts {
  accentStripe: string;
  category: string;
  wordmark: string;
  date: string;
}

export function buildFrameParts(config: CoverConfig): FrameParts {
  return {
    accentStripe: `<div class="cover__accent-stripe"></div>`,
    category: `<div class="cover__category">${escapeHtml(config.category)}</div>`,
    wordmark: `<div class="cover__wordmark">
      <p class="cover__wordmark-title">The Particle Post</p>
      <p class="cover__wordmark-tagline">No hype, just signal.</p>
    </div>`,
    date: `<div class="cover__date">${escapeHtml(formatCoverDate(config.date))}</div>`,
  };
}

export { escapeHtml };
