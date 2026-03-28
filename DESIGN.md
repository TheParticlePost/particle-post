# Particle Post — Design System
## Version Final | March 2026

---

## 1. Creative North Star: "The Kinetic Ledger"

Particle Post sits at the intersection of AI innovation and global business strategy. The design combines the structural authority of a financial ledger with the energy of artificial intelligence — precise, confident, and fast.

**Audience:** CEOs, CFOs, fund managers, board members, operators — many reading in a second language. Clarity and readability are non-negotiable.

**Aesthetic direction:** "Bold Precision." Confident, premium, editorial. Think Financial Times density + Semrush boldness + Stripe craft. We treat every screen as a broadsheet newspaper reinvented for a digital-first future.

**What we are NOT:** a muted institutional site, a neon SaaS dashboard, a generic dark-mode template.

---

## 2. Logo

The Particle Post monogram is a bold geometric "P" with a single vermillion circle (the "particle") at the upper-right shoulder. The mark is confident and graphic.

### Variants
- **Dark background:** Warm White P (`#F5F0EB`) + Vermillion dot (`#E8552E`) on Rich Black (`#141414`)
- **Light background:** Near-Black P (`#1C1C1C`) + Vermillion dot (`#E8552E`) on light surface
- **Monogram only:** For favicons, avatars, app icons — the dot is ALWAYS vermillion
- **Full lockup:** Monogram + "PARTICLE POST" wordmark in Sora Bold, uppercase, tight tracking

### Logo Files
Located in `public/`:
- `logo-monogram-light.svg` / `.png` — monogram on light bg
- `logo-monogram-dark.svg` / `.png` — monogram on dark bg
- `logo-lockup.svg` — full wordmark (Claude Code will build this)
- `favicon.ico` — derived from monogram

### Rules
- Minimum clear space: 1.5× monogram height on all sides
- Minimum size: 24px digital
- Never rotate, stretch, add effects, or rearrange

---

## 3. Colors

### Core Surfaces — "The Stage"

Treat the UI as a physical stack of materials. Depth is communicated through background color shifts, never through shadows.

| Level | Name | Hex | Token | Usage |
|-------|------|-----|-------|-------|
| -1 | Deep Black | `#0E0E0E` | `surface-container-lowest` | Footer, data tickers, deepest recesses |
| 0 | Rich Black | `#141414` | `surface-dim` / `background` | Main page background — the canvas |
| 1 | Charcoal | `#1C1B1B` | `surface-container-low` | Section backgrounds, alternating zones |
| 2 | Onyx | `#1E1E1E` | `surface-container` | Cards, elevated content containers |
| 3 | Carbon | `#282828` | `surface-container-high` | Inputs, popovers, tooltips, dropdowns |
| 4 | Smoke | `#333333` | `surface-bright` | Highest elevation, rare |

### The Signature — Vermillion

| Role | Hex | Usage |
|------|-----|-------|
| **Vermillion** | `#E8552E` | THE accent. Links, CTAs, overlines, featured borders, the logo dot |
| **Vermillion Hover** | `#F06840` | Hover states — increase saturation, not lightness |
| **Vermillion Subtle** | `rgba(232,85,46,0.10)` | Tag backgrounds, subtle emphasis |
| **Vermillion Muted** | `rgba(232,85,46,0.06)` | Featured card tint, section highlights |

### Text & Neutrals

| Role | Hex | Token | Usage |
|------|-----|-------|-------|
| **Warm White** | `#F5F0EB` | `on-surface` | Headlines, primary text. NEVER use pure #FFFFFF. |
| **Cream** | `#E6DED6` | — | Body text, descriptions |
| **Sand** | `#A89E94` | — | Metadata, bylines, timestamps |
| **Drift** | `#6E6660` | — | Captions, placeholders, helper text |

### Borders

| Role | Hex | Token | Usage |
|------|-----|-------|-------|
| **Ghost Border** | `rgba(90,65,59,0.20)` | `outline-variant` at 20% | Default card borders — subtle, warm |
| **Ghost Border Hover** | `#A98A82` | `outline` at 100% | Hover state on interactive cards |
| **Ember** | `#3D3733` | `outline-variant` | Fallback solid border where ghost doesn't work |

### Semantic Colors

| Role | Hex | Usage |
|------|-----|-------|
| **Positive** | `#2D9B5A` | Gains, bullish, confirmations |
| **Negative** | `#D14040` | Losses, bearish, errors |
| **Informational** | `#5A7FA0` | Neutral data, info badges |
| **Warning** | `#D4962A` | Caution, attention |

### Color Rules

1. **The "No-Line" Rule:** Do NOT use 1px solid lines to separate large page sections. Use background color shifts between surface levels instead. Let the change in value define the edge, not a stroke.
2. **Vermillion is the personality.** It appears at ~5–8% of total page color. If you removed all vermillion, the page should feel like it's missing its soul.
3. **Backgrounds are warm.** Rich Black (#141414) has a warm undertone. Never drift toward blue-blacks or cool grays.
4. **Warm White, never pure white.** #F5F0EB prevents halation (eye strain) on dark backgrounds.
5. **Semantic colors for data only.** Green/red are never used for UI decoration.
6. **No gradients in functional UI.** Colors are flat, confident, solid.

---

## 4. Typography

### Font Stack

| Role | Font | Weights | Source |
|------|------|---------|--------|
| **Headlines & Display** | **Sora** | 700 | Google Fonts (self-hosted WOFF2) |
| **Body & UI** | **DM Sans** | 400, 500, 600 | Google Fonts (self-hosted WOFF2) |
| **Data & Numbers** | **IBM Plex Mono** | 400, 500 | Google Fonts (self-hosted WOFF2) |

### Type Scale

| Element | Font | Size | Weight | Line Height | Letter Spacing |
|---------|------|------|--------|-------------|----------------|
| Display (Hero) | Sora | 56px / 3.5rem | 700 | 1.08 | -0.02em |
| H1 | Sora | 40px / 2.5rem | 700 | 1.12 | -0.02em |
| H2 | Sora | 32px / 2rem | 700 | 1.2 | -0.015em |
| H3 | Sora | 22px / 1.375rem | 700 | 1.3 | -0.01em |
| H4 | DM Sans | 18px / 1.125rem | 600 | 1.4 | 0 |
| Body Large | DM Sans | 18px / 1.125rem | 400 | 1.8 | 0 |
| Body | DM Sans | 16px / 1rem | 400 | 1.8 | 0 |
| Body Small | DM Sans | 14px / 0.875rem | 400 | 1.65 | 0 |
| Caption | DM Sans | 12px / 0.75rem | 500 | 1.5 | 0.02em |
| Overline | Sora | 11px / 0.6875rem | 700 | 1.4 | 0.12em |
| Data | IBM Plex Mono | 14px | 400 | 1.5 | 0.02em |

### Global Readability (non-native English readers)
1. Body: 16px minimum everywhere, including mobile. Line height 1.8.
2. Max line length: 65 characters.
3. No italic body text — use bold or vermillion for emphasis.
4. One idea per paragraph, 2–4 sentences max.
5. Paragraph spacing: 28px.
6. Numbers always in IBM Plex Mono — dates, read times, author names, all metadata.

### Typography Rules
- **Sora is for headlines and overlines ONLY.** Never for body, labels, or UI elements.
- **Tight letter-spacing on Sora** (-0.02em) creates the editorial print feel.
- **Overlines are ALWAYS vermillion.** Sora 11px, weight 700, 0.12em tracking, uppercase.
- **No center alignment** for body text. Left-aligned, rag-right. Exception: subscribe page hero.
- **No rounded corners > 6px.** Containers feel architectural and sharp.

---

## 5. Elevation & Depth

### The Layering Principle
No drop shadows. EVER. Depth is an architectural construct of color. To lift a card, shift from `surface-dim` (#141414) to `surface-container` (#1E1E1E). To lift further, use `surface-container-high` (#282828).

### Ghost Borders
Cards use a "Ghost Border" — `outline-variant` (#5A413B) at **20% opacity**. On hover, the border transitions to 100% opacity `outline` (#A98A82) or Vermillion to signal focus. This is subtler and more premium than a solid 1px border.

### Glassmorphism (Navigation & Breaking News only)
For the sticky nav and any "Breaking News" ticker:
- Background: `surface-container` (#1E1E1E) at 80% opacity
- Effect: `backdrop-filter: blur(12px)`
- This lets content flow underneath, maintaining the "kinetic" theme

---

## 6. Components

### Buttons
| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| **Primary** | Vermillion `#E8552E` | Warm White `#F5F0EB` | None | Increase saturation (not lighten) |
| **Secondary** | Transparent | Vermillion | 1px Ember | Border → Vermillion |
| **Ghost** | Transparent | Cream `#E6DED6` | None | Text → Warm White |

Button specs: Height 44px default, 38px compact, 52px hero. Radius: 6px. Font: DM Sans 14px weight 600. Primary buttons: uppercase with 0.05em tracking.

### Cards
| Type | Border | Background | Accent |
|------|--------|------------|--------|
| **Standard** | Ghost border (20% opacity) | Onyx `#1E1E1E` | None |
| **Featured** | Ghost border + **3px vermillion left border** (Editorial Stripe) | Onyx | Overline in Vermillion |
| **Interactive** | Ghost border → 100% on hover | Onyx → slight shift | 150ms transition |
| **Data** | Ghost border | Rich Black `#141414` | None |

**The "Editorial Stripe"** (3px solid Vermillion left-border on featured cards) is a signature element.

**Spacing between list items:** No dividers. Use `spacing-6` (2rem) of vertical white space.

### Inputs
- Surface: Carbon `#282828`
- Border: Ghost border, focus: Vermillion. No glow or outer shadow.
- Text: Warm White. Placeholder: Drift `#6E6660`
- Height: 46px. Radius: 6px.

### Tags & Badges
| Type | Style |
|------|-------|
| **Category Overline** | Sora 11px, 700, 0.12em, uppercase, Vermillion |
| **Filter Pill (active)** | Vermillion bg, Warm White text |
| **Filter Pill (inactive)** | Carbon bg, Cream text |
| **Sentiment** | Pill, semantic color at 12% opacity bg + matching text |
| **Premium** | Pill, Vermillion 10% bg, Vermillion text |

### Data Ticker
- Horizontal scrolling bar in IBM Plex Mono
- Background: `surface-container-lowest` (#0E0E0E)
- All-caps, minimal padding, monospaced

---

## 7. The Vermillion System — Where the Personality Lives

Vermillion appears in specific, consistent places across every page. This creates instant brand recognition.

### Where Vermillion ALWAYS appears
| Element | How |
|---------|-----|
| Logo dot | The particle in the monogram |
| Overline labels | "MORNING BRIEFING," "AI & MARKETS," "DEEP DIVE" |
| Links | All text links (hover: brighter vermillion) |
| Primary CTA buttons | Vermillion background |
| Active nav item | Underline or indicator |
| Featured card left border | 3px Editorial Stripe |
| Breaking news indicator | Dot or badge |
| Email header rule | 2px line below logo |
| Reading progress bar | Thin bar at top of article pages |
| Chart primary series | First data series always |
| Pull quotes | Left border bar |
| Filter pills (active) | Vermillion background |

### Where Vermillion NEVER appears
- Body text
- Backgrounds (except at 6–10% opacity tints)
- Headlines
- Large filled areas
- Decorative elements without function

---

## 8. Motion & Animation

### Philosophy
Animation adds energy without noise. Every transition justifies its existence.

### Timing
| Type | Duration | Easing |
|------|----------|--------|
| Micro | 100ms | ease-out |
| Short | 180ms | `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| Medium | 300ms | `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| Long | 500ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Stagger | 50ms between items | — |

### Allowed Animations
| Element | Behavior |
|---------|----------|
| Page load | Staggered fade-up (opacity + Y 12px→0), 500ms, 50ms stagger |
| Card hover | Ghost border → opaque, 180ms |
| Button hover | Saturation increase, 150ms |
| Nav scroll | Transparent → Onyx 80% + blur(12px), 180ms |
| Data updates | Number cross-fade, 200ms |
| Loading | Skeleton shimmer, warm-toned |

### Not Allowed
- No parallax, no scale/zoom on hover, no bounce/elastic easing
- No confetti, sparkles, or particle effects
- No animated backgrounds or gradients

---

## 9. Data Visualization

### Chart Colors (in order)
1. Vermillion `#E8552E`
2. Slate Blue `#5A7FA0`
3. Amber `#D4962A`
4. Evergreen `#2D9B5A`
5. Sand `#A89E94`

### Chart Rules
- Background: Rich Black or Onyx
- Grid lines: Ember at 0.5px
- Axis labels: IBM Plex Mono, 12px, Drift
- Data labels: IBM Plex Mono, 14px, Cream
- No 3D charts. Annotate key data points on the chart.
- Tooltips: Carbon bg, ghost border, 6px radius

---

## 10. Layout

### Grid
- Container: 1200px max-width
- Columns: 12. Gutter: 24px desktop, 16px mobile
- Article body: 680px centered (65ch line length)
- Sidebar: 300px

### Spacing Scale (base 4px)
`--space-1` 4px | `--space-2` 8px | `--space-3` 12px | `--space-4` 16px | `--space-5` 20px | `--space-6` 24px | `--space-8` 32px | `--space-10` 40px | `--space-12` 48px | `--space-16` 64px | `--space-20` 80px | `--space-24` 96px

### Breakpoints
| Name | Width | Columns |
|------|-------|---------|
| Mobile | < 640px | 4 |
| Tablet | 640–1024px | 8 |
| Desktop | 1024–1440px | 12 |
| Wide | > 1440px | 12 (centered) |

### Layout Principles
1. **Asymmetric margins.** Left-aligned text, imagery can bleed right.
2. **Density inside cards, breathing room between them.**
3. **Left-aligned everything.** Exception: subscribe hero.
4. **Sticky nav:** 64px height with glassmorphism on scroll.
5. **Vermillion creates visual rhythm** — overlines, borders, links pulse down the page.

---

## 11. Do's and Don'ts

### Do
- Use background color shifts to define section boundaries (No-Line Rule)
- Use IBM Plex Mono for ALL metadata (dates, read times, author names)
- Use Warm White `#F5F0EB` — never pure `#FFFFFF`
- Use Ghost Borders (20% opacity) — not solid 1px lines
- Keep buttons' hover as saturation increase, not lightening

### Don't
- No gradients anywhere in functional UI
- No rounded corners > 6px
- No center-aligned body text (except subscribe hero)
- No dividers — use whitespace for separation
- No drop shadows — ever
- No Epilogue, Manrope, or Space Grotesk fonts — Sora/DM Sans/IBM Plex Mono only

---

## 12. CSS Variables

```css
:root {
  --bg-deep: #0E0E0E;
  --bg-base: #141414;
  --bg-low: #1C1B1B;
  --bg-container: #1E1E1E;
  --bg-high: #282828;
  --bg-bright: #333333;

  --accent: #E8552E;
  --accent-hover: #F06840;
  --accent-subtle: rgba(232, 85, 46, 0.10);
  --accent-muted: rgba(232, 85, 46, 0.06);

  --text-primary: #F5F0EB;
  --text-body: #E6DED6;
  --text-secondary: #A89E94;
  --text-muted: #6E6660;

  --border-ghost: rgba(90, 65, 59, 0.20);
  --border-hover: #A98A82;
  --border-solid: #3D3733;

  --color-positive: #2D9B5A;
  --color-negative: #D14040;
  --color-info: #5A7FA0;
  --color-warning: #D4962A;

  --radius: 6px;
  --ease: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-expressive: cubic-bezier(0.16, 1, 0.3, 1);

  --font-display: 'Sora', system-ui, sans-serif;
  --font-sans: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', 'Courier New', monospace;
}
```

---

*This document is the single source of truth. Every pixel Claude Code generates answers to it.*
