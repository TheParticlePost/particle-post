# CLAUDE.md — Particle Post UI Redesign

## Project Context
Particle Post (theparticlepost.com) is a twice-daily AI-powered publication
for CEOs, CFOs, fund managers, and senior operators at the intersection of
AI, business strategy, and implementation. Many readers are non-native
English speakers. The content focuses on AI use cases, business implementation,
and strategic impact — NOT stock trading or crypto speculation.

## Design Direction
**"The Kinetic Ledger"** — institutional authority meets bold energy.
Read DESIGN.md before ANY design decision. It is the single source of truth.

Key non-negotiable constraints from DESIGN.md:
- Vermillion (#E8552E) is the ONLY accent color — used with surgical precision
- NO drop shadows anywhere — depth through background color shifts ONLY
- NO solid 1px lines to separate page sections — use the "No-Line Rule"
- Ghost borders: outline-variant (#5A413B) at 20% opacity for cards
- Warm White (#F5F0EB) for text — NEVER pure #FFFFFF
- No rounded corners > 6px — architectural, not bubbly
- No center-aligned body text (exception: subscribe hero only)
- Body text: 16px minimum, line-height 1.8, max 65 characters wide
- All metadata in IBM Plex Mono (dates, read times, author names)

## Tech Stack
- Next.js 14+ (App Router)
- TypeScript (strict)
- Tailwind CSS v4
- Framer Motion (used sparingly per DESIGN.md motion rules)
- Supabase for backend/auth
- Self-hosted fonts: Sora (headlines), DM Sans (body/UI), IBM Plex Mono (data)

## Font Corrections
The Stitch mockups use Epilogue, Manrope, and Space Grotesk in some places.
These are WRONG. The correct fonts are:
- Headlines: **Sora** (not Epilogue)
- Body: **DM Sans** (not Manrope)
- Data/Mono: **IBM Plex Mono** (not Space Grotesk)
Replace all instances when rebuilding.

## Stitch HTML Reference
The `design-references/stitch-html/` folder contains HTML exports from
Google Stitch. Use these as STRUCTURAL reference for layout, section
order, and component placement. But DO NOT copy the code directly —
it uses Tailwind CDN, has wrong fonts, and is not production-grade.

Rebuild each page in proper Next.js with:
- Correct font stack from DESIGN.md
- Proper Next.js App Router structure
- Server/client component separation
- Self-hosted fonts via @font-face
- All Tailwind custom tokens from DESIGN.md

The Stitch HTML is a BLUEPRINT, not production code.

## Design Reference Screenshots
The `design-references/` folder contains PNG screenshots of each page.
Match these layouts as closely as possible:
- `home.png` — Homepage with nav, hero, briefings, featured, trending
- `deepdive.png` — Article reading page with sidebar and data callouts
- `archive.png` — Filterable article grid
- `subscribe.png` — Conversion landing page

## Available Tools — USE THEM

### UI UX Pro Max Skill
BEFORE building any page, run:
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "editorial finance dark premium bold" --design-system -p "Particle Post" --stack nextjs
```
Domain searches for specific decisions:
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "bold geometric sans modern" --domain typography
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "dark warm premium editorial" --domain style
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "financial data newsletter" --domain chart
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "dark mode accessible" --domain ux
```

### 21st.dev Magic MCP
Generate components then refine to match DESIGN.md:
- `/ui create a dark editorial article card with ghost border, vermillion left accent stripe, and category overline`
- `/ui create a sticky glassmorphism nav with logo, text links, and vermillion subscribe button`
- `/ui create a hero section with oversized Sora bold headline, overline, and email signup with vermillion CTA`

### AntV Chart MCP (for article data visualizations)
Use for generating branded charts that match DESIGN.md chart rules:
- Primary series always Vermillion
- Dark background (Rich Black or Onyx)
- IBM Plex Mono for all labels
- No 3D, no decorative elements

## Implementation Order

### PROMPT 1: Foundation
Set up Tailwind config, CSS variables, font loading, base layout.
All custom colors, tokens, and font families from DESIGN.md.
Create globals.css with the full :root variable block.
Download and self-host Sora (700), DM Sans (400, 500, 600),
IBM Plex Mono (400, 500) as WOFF2 in public/fonts/.
Create base layout.tsx with Rich Black body background.

### PROMPT 2: Reusable Components — The Vermillion System
Build these in src/components/ before any pages:
1. OverlineLabel — Sora 11px/700/0.12em/uppercase/vermillion
2. ArticleCard — Ghost border, Sora headline, DM Sans excerpt,
   Plex Mono metadata. Props: featured (adds Editorial Stripe)
3. Button — primary/secondary/ghost variants per DESIGN.md
4. SentimentBadge — Bullish(green)/Bearish(red)/Neutral(blue) pills
5. DataText — Wrapper applying Plex Mono + tabular-nums
6. GhostBorder — Utility for the 20%-opacity border pattern
7. ProgressBar — 3px vermillion, scroll-driven, fixed top
8. EditorialStripe — The 3px vermillion left-border treatment
9. DataTicker — Horizontal scrolling bar in Plex Mono
10. FilterPill — Active (vermillion bg) / inactive (carbon bg) toggle

Reference design-references/ screenshots for visual targets.
Use /ui commands from 21st.dev to generate initial code, then
refine to match DESIGN.md exactly — especially ghost borders,
no shadows, correct hover behaviors (saturation not lightness).

### PROMPT 3: Navigation
Sticky 64px header with glassmorphism.
- At top: transparent bg
- On scroll: Onyx (#1E1E1E) at 80% opacity + backdrop-blur(12px)
- Left: Particle Post logo (use SVG from public/)
- Center: nav links in DM Sans 14px/500, cream, vermillion on active
- Right: "Subscribe" primary button (compact)
- Mobile: hamburger → slide-in panel
- Active page link gets vermillion underline
Use Framer Motion for the scroll-triggered bg transition.
Reference home.png for the exact layout.

### PROMPT 4: Homepage
Build src/app/page.tsx. Reference home.png + stitch-html/home.txt.
Sections in order:
1. Hero — OverlineLabel "MORNING BRIEFING", Display-size Sora headline,
   DM Sans subtitle, email form (carbon input + vermillion CTA), trust line
2. AM/PM Briefings — 2-column: "AM Intelligence Wrap" + "PM Market Closing"
   with 4-5 headline links each, timestamps in Plex Mono
3. Featured Deep Dive — full-width ArticleCard with editorial stripe,
   image right, overline + headline + excerpt + metadata
4. Trending Now — row of 3 ArticleCards with category + sentiment badges
5. Footer — vermillion 2px rule at top, newsletter signup, social links,
   legal links in Plex Mono, copyright
Apply staggered fade-up on page load (Framer Motion).

### PROMPT 5: Article / Deep Dive Page
Build src/app/article/[slug]/page.tsx. Reference deepdive.png +
stitch-html/deep_dive_article.txt.
1. ProgressBar at viewport top
2. Article header (max-width 680px centered): OverlineLabel, Sora H1,
   meta line in Plex Mono (author, date, read time), ghost border divider
3. Article body (680px): DM Sans 16px/1.8, Sora H2/H3 subheads,
   vermillion links, pull quotes with Editorial Stripe,
   data callout cards (Onyx bg, large Plex Mono numbers, vermillion highlight)
4. Right sidebar (desktop, 300px, sticky):
   - "Related Articles" — 3 compact cards with editorial stripes
   - "Market Snapshot" — ticker data in Plex Mono with semantic colors
5. After article: share buttons, "More from [Category]" 3-card row,
   newsletter signup
The body text reading experience is the CORE product. Make it beautiful.

### PROMPT 6: Archive Page
Build src/app/archive/page.tsx. Reference archive.png +
stitch-html/archive.txt.
1. Page header: "Archive" Sora Bold H1, subtitle DM Sans
2. Filter bar: row of FilterPill components (All, Morning, Evening,
   Deep Dives, AI, Markets, Strategy) + search input
3. Article grid: 3 columns desktop, 2 tablet, 1 mobile.
   Each card: ghost border, OverlineLabel category, Sora headline,
   DM Sans 2-line excerpt, Plex Mono metadata, sentiment badge.
   First card: featured with Editorial Stripe.
4. "Load More" ghost button centered
Make filters functional with React state (client component).

### PROMPT 7: Subscribe / Landing Page
Build src/app/subscribe/page.tsx. Reference subscribe.png +
stitch-html/subscribe.txt.
This is the conversion page — most polished animation allowed.
1. Minimal nav (logo only, no links)
2. Hero (centered, generous padding):
   - OverlineLabel "AI-POWERED INTELLIGENCE"
   - Display headline: "The AI briefing 12,000 leaders read before
     markets open." — Sora Bold 56px, tight tracking
   - Subtitle in DM Sans, cream
   - Large email form + vermillion "Subscribe — Free" CTA
   - Trust text in drift
3. Social proof: gray placeholder logos, "Trusted by leaders at"
4. What you get: 3 cards (Morning Briefing, Evening Recap, Weekly
   Deep Dive) with Lucide icons, descriptions
5. Sample content: 3 article previews with Editorial Stripes
6. Final CTA: repeat signup form
7. Footer
Hero animation should feel cinematic — staggered fade-up with
slightly longer durations than other pages.

### PROMPT 8: Chart Components for Articles
Build reusable chart components in src/components/charts/:
- PriceChart — Recharts line chart, vermillion primary series
- ComparisonBar — horizontal bars for metric comparison
- DataCallout — large number in Plex Mono with label and vermillion accent
- DataTable — styled table with Plex Mono, semantic row colors
- TrendSparkline — tiny inline sparkline for cards
All charts follow DESIGN.md: dark bg, Plex Mono labels, vermillion primary,
ember grid lines, no 3D, annotated key points.

### PROMPT 9: Polish Pass
Review entire site against DESIGN.md:
1. COLOR: No hardcoded hex — all Tailwind custom classes
2. FONTS: Sora headlines, DM Sans body, Plex Mono data. No Epilogue/Manrope.
3. BORDERS: Ghost borders (20% opacity), NOT solid 1px
4. SHADOWS: Zero. None. Anywhere.
5. VERMILLION: Present in all Section 7 locations, absent from all exclusions
6. SPACING: 4px base scale, no arbitrary values
7. NO-LINE RULE: Sections divided by bg color shifts, not strokes
8. RESPONSIVE: Test 375px, 768px, 1024px, 1440px
9. HOVER: Ghost border → opaque. Buttons → saturation increase. No lightening.
10. FOCUS: Visible focus ring for keyboard nav
11. A11Y: WCAG AA contrast, alt text, tab navigation
12. ANIMATION: Correct easing curves, no bounce/elastic

## Code Standards
- ALL colors: Tailwind custom classes or CSS variables
- ZERO inline hex codes
- Sora ONLY for headlines and overlines
- Framer Motion ONLY for page entrance and modal transitions
- Every interactive element: visible focus state
- Dark mode is the ONLY mode
- Images: next/image with descriptive alt text
- All numbers/data: font-mono

## Brand Voice (for any generated placeholder content)
- Direct, confident, clear. No idioms or sports metaphors.
- Lead with the point. Context follows.
- Active voice. Concrete verbs.
- Headlines: 6-10 words, must contain a verb, no clickbait.
- Content focus: AI implementation, business strategy, executive decisions.
  NOT stock trading, NOT crypto speculation.
