/**
 * Particle Post Design Tokens — "The Kinetic Ledger"
 * From DESIGN.md. Use these TypeScript constants in components
 * for values that can't be expressed as Tailwind classes.
 */

// ── Surfaces (dark theme canonical values) ──────────────────
export const surfaces = {
  deep: "#0E0E0E",      // Footer, data tickers
  base: "#141414",       // Main page background
  low: "#1C1B1B",        // Alternating sections
  container: "#1E1E1E",  // Cards
  high: "#282828",       // Inputs, popovers
  bright: "#333333",     // Highest elevation
} as const;

// ── Accent — Vermillion ─────────────────────────────────────
export const vermillion = {
  DEFAULT: "#E8552E",
  hover: "#F06840",
  subtle: "rgba(232, 85, 46, 0.10)",
  muted: "rgba(232, 85, 46, 0.06)",
} as const;

// ── Text (dark theme canonical) ─────────────────────────────
export const textColors = {
  primary: "#F5F0EB",   // Warm White — headlines
  body: "#E6DED6",      // Cream — body text
  secondary: "#A89E94", // Sand — metadata
  muted: "#6E6660",     // Drift — captions
} as const;

// ── Borders ─────────────────────────────────────────────────
export const borders = {
  ghost: "rgba(90, 65, 59, 0.20)",
  hover: "#A98A82",
  solid: "#3D3733",     // Ember
} as const;

// ── Semantic ────────────────────────────────────────────────
export const semantic = {
  positive: "#2D9B5A",
  negative: "#D14040",
  info: "#5A7FA0",
  warning: "#D4962A",
} as const;

// ── Chart Colors (in order, per DESIGN.md Section 9) ────────
export const chartColors = [
  "#E8552E", // Vermillion — always first
  "#5A7FA0", // Slate Blue
  "#D4962A", // Amber
  "#2D9B5A", // Evergreen
  "#A89E94", // Sand
] as const;

// ── Typography ──────────────────────────────────────────────
export const fonts = {
  display: "'Sora', system-ui, sans-serif",
  body: "'DM Sans', system-ui, sans-serif",
  mono: "'IBM Plex Mono', 'Courier New', monospace",
} as const;

export const typeScale = {
  displayHero: { size: "3.5rem", lineHeight: "1.08", letterSpacing: "-0.02em", weight: 700 },
  h1: { size: "2.5rem", lineHeight: "1.12", letterSpacing: "-0.02em", weight: 700 },
  h2: { size: "2rem", lineHeight: "1.2", letterSpacing: "-0.015em", weight: 700 },
  h3: { size: "1.375rem", lineHeight: "1.3", letterSpacing: "-0.01em", weight: 700 },
  h4: { size: "1.125rem", lineHeight: "1.4", letterSpacing: "0", weight: 600 },
  bodyLarge: { size: "1.125rem", lineHeight: "1.8", weight: 400 },
  body: { size: "1rem", lineHeight: "1.8", weight: 400 },
  bodySmall: { size: "0.875rem", lineHeight: "1.65", weight: 400 },
  caption: { size: "0.75rem", lineHeight: "1.5", letterSpacing: "0.02em", weight: 500 },
  overline: { size: "0.6875rem", lineHeight: "1.4", letterSpacing: "0.12em", weight: 700 },
  data: { size: "0.875rem", lineHeight: "1.5", letterSpacing: "0.02em", weight: 400 },
} as const;

// ── Animation (DESIGN.md Section 8) ─────────────────────────
export const animation = {
  micro: { duration: "100ms", easing: "ease-out" },
  short: { duration: "180ms", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" },
  medium: { duration: "300ms", easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" },
  long: { duration: "500ms", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
  stagger: "50ms",
} as const;

// ── Layout (DESIGN.md Section 10) ───────────────────────────
export const layout = {
  containerMax: "1200px",
  articleBody: "680px",
  sidebar: "300px",
  gutterDesktop: "24px",
  gutterMobile: "16px",
  navHeight: "64px",
} as const;

// ── Spacing Scale (base 4px) ────────────────────────────────
export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
} as const;

// ── Component Specs ─────────────────────────────────────────
export const buttonHeight = {
  compact: "38px",
  default: "44px",
  hero: "52px",
} as const;

export const inputHeight = "46px";
export const maxRadius = "6px";
export const navHeight = "64px";
