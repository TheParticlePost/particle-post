/**
 * Kinetic Ledger brand tokens for covers.
 * Values mirror pipeline/graphics/brand.py — do not diverge.
 */

export const BRAND = {
  // Surfaces
  richBlack: "#141414",
  onyx: "#1E1E1E",
  carbon: "#282828",

  // Accent (single accent per DESIGN.md)
  vermillion: "#E8552E",
  vermillionHover: "#F06840",

  // Text
  warmWhite: "#F5F0EB",
  cream: "#E6DED6",
  drift: "#A89E94",
  ember: "#5A413B",

  // Ghost border — 20% opacity ember
  ghost: "rgba(90, 65, 59, 0.2)",

  // Semantic
  green: "#22C55E",
  red: "#EF4444",
  amber: "#F59E0B",
  blue: "#3B82F6",

  // Typography
  fontHeadline: "Sora",
  fontBody: "DM Sans",
  fontMono: "IBM Plex Mono",
} as const;

/**
 * Format a date (ISO or Date) as "Apr 8, 2026" in en-US.
 * Accepts already-formatted strings and returns them untouched.
 */
export function formatCoverDate(input: string): string {
  if (!input) return "";
  // Already formatted (contains a comma)
  if (/[A-Za-z]{3,}\s\d{1,2},\s\d{4}/.test(input)) return input;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input;
  // Format in UTC to avoid timezone drift ("2026-04-08" parses as UTC
  // midnight, which becomes the previous day in most local timezones).
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
