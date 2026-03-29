/**
 * Particle Post Design Tokens — "The Kinetic Ledger"
 * Only exports values actually used by components.
 * All other tokens live in tailwind.config.ts and globals.css.
 */

// ── Chart Colors (in order, per DESIGN.md Section 9) ────────
// Used by: price-chart, comparison-bar, trend-sparkline,
// pulse-adoption-chart, pulse-roi-chart, pulse-industry-breakdown
export const chartColors = [
  "#E8552E", // Vermillion — always first
  "#5A7FA0", // Slate Blue
  "#D4962A", // Amber
  "#2D9B5A", // Evergreen
  "#A89E94", // Sand
] as const;
