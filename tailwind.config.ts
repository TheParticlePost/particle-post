import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          deep: "var(--bg-deep)",
          base: "var(--bg-base)",
          low: "var(--bg-low)",
          container: "var(--bg-container)",
          high: "var(--bg-high)",
          bright: "var(--bg-bright)",
        },
        // Legacy aliases for existing components during migration
        "bg-primary": "var(--bg-base)",
        "bg-secondary": "var(--bg-low)",
        "bg-tertiary": "var(--bg-high)",
        surface: "var(--bg-container)",
        foreground: {
          DEFAULT: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        text: {
          primary: "var(--text-primary)",
          body: "var(--text-body)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          subtle: "var(--accent-subtle)",
          muted: "var(--accent-muted)",
        },
        border: {
          ghost: "var(--border-ghost)",
          hover: "var(--border-hover)",
          solid: "var(--border-solid)",
        },
        positive: "var(--color-positive)",
        negative: "var(--color-negative)",
        info: "var(--color-info)",
        warning: "var(--color-warning)",
        // Legacy aliases
        danger: "var(--color-negative)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "'Courier New'", "monospace"],
      },
      fontSize: {
        // DESIGN.md Type Scale
        "display-hero": ["3.5rem", { lineHeight: "1.08", letterSpacing: "-0.02em" }],
        "display-xl": ["2.5rem", { lineHeight: "1.12", letterSpacing: "-0.02em" }],
        "display-lg": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.015em" }],
        "display-md": ["1.375rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "display-sm": ["1.125rem", { lineHeight: "1.4", letterSpacing: "0" }],
        "body-lg": ["1.125rem", { lineHeight: "1.8" }],
        "body-md": ["1rem", { lineHeight: "1.8" }],
        "body-sm": ["0.875rem", { lineHeight: "1.65" }],
        "caption": ["0.75rem", { lineHeight: "1.5", letterSpacing: "0.02em" }],
        "overline": ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.12em" }],
        "data": ["0.875rem", { lineHeight: "1.5", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "2px",
        md: "4px",
        lg: "6px",
        xl: "6px",
        "2xl": "6px",
        card: "6px",
      },
      spacing: {
        "space-1": "4px",
        "space-2": "8px",
        "space-3": "12px",
        "space-4": "16px",
        "space-5": "20px",
        "space-6": "24px",
        "space-8": "32px",
        "space-10": "40px",
        "space-12": "48px",
        "space-16": "64px",
        "space-20": "80px",
        "space-24": "96px",
      },
      maxWidth: {
        article: "680px",
        container: "1200px",
        sidebar: "300px",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "fade-in": "fade-in 0.5s var(--ease)",
        "slide-up": "slide-up 0.5s var(--ease)",
        "fade-up": "fade-up 0.5s var(--ease-expressive)",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      transitionTimingFunction: {
        kinetic: "cubic-bezier(0.25, 0.1, 0.25, 1)",
        expressive: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      backdropBlur: {
        glass: "12px",
      },
    },
  },
  plugins: [],
};

export default config;
