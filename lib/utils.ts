import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a date string safely. Date-only strings ("2026-03-26") are treated
 * as UTC midnight by JS, which shifts them back one day in timezones behind
 * UTC. We normalize these to noon UTC so they never cross day boundaries.
 */
function parseDate(dateString: string): Date {
  // Date-only format: YYYY-MM-DD (exactly 10 chars, no T)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return new Date(dateString + "T12:00:00Z");
  }
  return new Date(dateString);
}

export function formatDate(dateString: string): string {
  const date = parseDate(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(dateString: string): string {
  const date = parseDate(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 238;
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const CATEGORIES = [
  { name: "AI Strategy", slug: "ai-strategy", color: "#E8552E" },
  { name: "Implementation", slug: "implementation", color: "#D4962A" },
  { name: "Operations & Finance", slug: "operations-finance", color: "#A89E94" },
  { name: "Risk & Governance", slug: "risk-governance", color: "#2D9B5A" },
  { name: "Industry Signals", slug: "industry-signals", color: "#5A7FA0" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
