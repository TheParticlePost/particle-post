```markdown
# Design System Document: Particle Post

## 1. Overview & Creative North Star: "The Kinetic Ledger"

This design system is built for **Particle Post**, a publication sitting at the intersection of high-frequency AI innovation and the rigid precision of global finance. Our Creative North Star is **"The Kinetic Ledger."** It combines the structural authority of a traditional financial ledger with the energetic, fast-moving "particles" of artificial intelligence.

To move beyond the "standard dark mode template," this system utilizes intentional asymmetry. We reject the comfort of centered layouts in favor of left-heavy editorial alignments, oversized typography scales, and a "High-Contrast Noir" aesthetic. We treat every screen as a broadsheet newspaper reinvented for a digital-first, data-heavy future.

---

## 2. Colors

The palette is rooted in deep obsidian tones, punctuated by a high-energy Vermillion that demands immediate ocular attention.

### Core Palette
- **Background (`surface-dim` / `background`):** `#141414` (Rich Black) – The canvas.
- **Surface / Cards (`surface-container`):** `#1E1E1E` (Onyx) – Primary container color.
- **Alternative Surfaces (`surface-container-high`):** `#282828` (Carbon) – For interactive elements and inputs.
- **Accent (`primary`):** `#E8552E` (Vermillion) – To be used with surgical precision for CTAs and status indicators.
- **Positive:** `#2D9B5A` | **Negative:** `#D14040`

### The "No-Line" Rule
To maintain a premium editorial feel, do not use 1px solid lines to separate large sections of the page. Boundaries must be defined through **Background Color Shifts**. 
*   *Example:* A secondary news feed in `surface-container-lowest` (#0E0E0E) should sit directly against the `surface-dim` (#141414) main body. Let the change in value define the edge, not a stroke.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of materials.
1.  **Level 0 (Base):** `surface-dim` (#141414)
2.  **Level 1 (Sections):** `surface-container-low` (#1C1B1B)
3.  **Level 2 (Cards/Content):** `surface-container` (#1E1E1E)
4.  **Level 3 (Popovers/Inputs):** `surface-container-high` (#282828)

---

## 3. Typography

The typographic system creates a tension between the geometric "Sora" and the functional "DM Sans," bridged by the technical "IBM Plex Mono."

*   **Display & Headlines (Sora, Bold 700):** Set with a `-0.02em` letter-spacing. This "tight" setting mimics high-end print headlines. Use `headline-lg` (2rem) for standard articles and `display-lg` (3.5rem) for hero features.
*   **Body (DM Sans, Regular 400):** The workhorse. 16px base size with a generous `1.8 line-height`. This "airy" leading is essential for readability in long-form financial analysis against a dark background.
*   **Data/Numbers (IBM Plex Mono):** Used for stock tickers, timestamps, and AI model parameters. It signals "raw data" and "accuracy."
*   **Overlines (Sora, Bold 700):** 11px, `0.12em` tracking, Uppercase, in Vermillion. These act as "Eyebrows" to categorize content (e.g., TECH ANALYSIS).

---

## 4. Elevation & Depth

In this design system, we do not use drop shadows. Depth is an architectural construct of color and "Ghost" borders.

### The Layering Principle
Hierarchy is achieved by "stacking" tonal tiers. To lift a card, do not add a shadow; instead, move from `surface-dim` to `surface-container`.

### The "Ghost Border" Fallback
While we avoid 100% opaque borders, a "Ghost Border" is permitted for card definitions.
*   **Value:** `outline-variant` (#5A413B) at **20% opacity**.
*   **The Hover State:** On interaction, the border transitions to a 100% opaque `outline` (#A98A82) or the Vermillion accent to signal "Focus."

### Glassmorphism & Depth
For floating navigation or "Breaking News" tickers, use a backdrop blur:
*   **Background:** `surface-container` (#1E1E1E) at 80% opacity.
*   **Effect:** `backdrop-filter: blur(12px)`.
This allows the "particles" of content to flow underneath the interface, maintaining the "Kinetic" theme.

---

## 5. Components

### Buttons
*   **Primary:** Background: Vermillion (#E8552E); Text: Warm White; Radius: `6px`.
*   **Secondary:** Background: Transparent; Border: 1px Ember (#3D3733); Radius: `6px`.
*   **Behavior:** On hover, primary buttons should slightly increase in saturation (not lighten).

### Cards & Lists
*   **Standard Card:** #1E1E1E bg, 1px Ember border, 6px radius.
*   **Featured Card:** For major headlines, add a **3px solid Vermillion left-border**. This "Editorial Stripe" is a signature element of the system.
*   **Spacing:** No dividers between list items. Use `spacing-6` (2rem) of vertical white space to separate news items.

### Inputs
*   **Surface:** Carbon (#282828).
*   **Focus State:** The border transitions from Ember to Vermillion. No "glow" or outer shadow allowed.

### Data Tickers (Unique Component)
*   A horizontal scrolling bar using `IBM Plex Mono` for currency pairs (e.g., BTC/USD). 
*   Background: `surface-container-lowest` (#0E0E0E).
*   Visual Style: Monospaced, all-caps, minimal padding.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetric Margins:** Align text to a strict left-grid but allow imagery to bleed off the right edge of the container to create motion.
*   **Lean into Mono:** Use IBM Plex Mono for all metadata (dates, read times, author names).
*   **Respect the "Warmth":** Always use `Warm White` (#F5F0EB) for text. Never use pure #FFFFFF, which causes "halation" (eye strain) on dark backgrounds.

### Don’t:
*   **No Gradients:** We represent the precision of finance; colors should be flat, confident, and "solid."
*   **No Rounded Corners > 6px:** We avoid "bubbly" UI. All containers must feel architectural and sharp.
*   **No Center Alignment for Text:** Editorial integrity is maintained through left-aligned, rag-right typography.
*   **No Dividers:** If you feel the need to add a line, add `spacing-4` of empty space instead. Separation is achieved through silence.```