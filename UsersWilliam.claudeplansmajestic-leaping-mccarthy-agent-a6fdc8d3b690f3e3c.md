# Particle Post UI Fix Plan -- 29 Issues

## Overview
This plan addresses 15 confirmed unfixed issues across the Particle Post codebase, organized into 8 implementation phases.

---

## Phase 1: Quick Foundational Fixes (30 min)

### 1A. Fix light-theme border-ghost (Issue 11)
File: app/globals.css line 27
Change: border-ghost rgba(90, 65, 59, 0.12) to rgba(90, 65, 59, 0.20)

### 1B. Remove stale fontsource devDependencies (Issue 6)
File: package.json lines 34-37
Remove: fontsource-variable/dm-sans, fontsource/dm-sans, fontsource/ibm-plex-mono, fontsource/sora
Then run npm install and delete .next cache.

### 1C. Fix Archive nav link (Issue 26, partial)
File: components/layout/navbar.tsx line 18
Change: Archive href from /about/ to /archive/
Also update components/layout/footer.tsx with Archive link.

---

## Phase 2: Navbar Monogram SVG (Issue 21) (20 min)

### 2A. Replace pulsing-dot plus text logo with monogram SVG
File: components/layout/navbar.tsx lines 90-95

Monogram SVGs at public/logos/monogram-dark.svg and monogram-light.svg.
Use next/image with dark/light class switching. Size w-8 h-8 (32px).
Keep PARTICLE POST wordmark text beside it.
Also update mobile-nav.tsx and footer.tsx.

---

## Phase 3: Background Section Shifts (Issues 12/14) (30 min)

Alternate bg-base, bg-low, bg-container between sections.
Apply to article page Related Articles section and homepage sections.
Pattern: full-width section with bg class, max-w-container inner div.

---

## Phase 4: Staggered Fade-Up Animations (Issue 24) (30 min)

### 4A. New file: components/effects/fade-up.tsx
Framer Motion motion.div, delay prop, opacity 0-1, Y 12-0, 500ms, ease-expressive.
whileInView with viewport once:true.

### 4B. New file: components/effects/stagger-container.tsx
Framer Motion staggerChildren at 50ms intervals.

### 4C. Wrap homepage hero, briefing cards, deep dive, trending row, article grids, subscribe page cards.

---

## Phase 5: Article Page Sidebar Enhancement (Issue 5) (45 min)

### 5A. New file: components/articles/sidebar-related.tsx
Compact related articles with editorial-stripe left border.

### 5B. New file: components/sidebar/market-snapshot.tsx
Vertical ticker stack with S&P 500, NASDAQ, BTC, 10Y Treasury, VIX.
Font-mono, semantic colors, ghost-border card.

### 5C. Update app/posts/[slug]/page.tsx sidebar
Add SidebarRelatedArticles and MarketSnapshot below TableOfContents.
Give bottom RelatedArticles section bg-bg-low treatment.

---

## Phase 6: Archive Page (Issue 26) (45 min)

### 6A. New file: app/archive/page.tsx
Server component with getAllPostMeta(), hero, metadata.

### 6B. New file: components/archive/archive-content.tsx
Client component with CategoryTabs filter pills, 3-col ArticleGrid, FadeUp.

---

## Phase 7: Homepage Rebuild (Issues 1, 2, 3) (2+ hours)

### 7A. Update app/page.tsx
Pass latestArticle, recentArticles (8), trendingArticles (3).

### 7B. Rebuild components/home-content.tsx

Section 1 Hero (bg-bg-base): OverlineLabel MORNING BRIEFING, latest article title in Sora Bold display-hero, description, SubscribeForm, DataText social proof, FadeUp wrappers.

Section 2 AM/PM Briefings (bg-bg-low): 2-col grid, Morning/Evening Edition cards with ghost-border, article title lists with font-mono timestamps, hover-to-accent-border.

Section 3 Featured Deep Dive (bg-bg-base): editorial-stripe card, flex text-left image-right, OverlineLabel DEEP DIVE, grayscale-to-color image hover, Plex Mono metadata.

Section 4 Trending (bg-bg-low): 3-col grid, category pills, sentiment badges, ghost-border cards.

Section 5 DataTicker (bg-bg-deep): Full-width strip above footer with mock market data using existing DataTicker component.

---

## Phase 8: Polish and Remaining Issues (1 hour)

### 8A. Card hover (Issue 25): Verify transition. Add subtle shadow if needed.
### 8B. Subscribe cards (Issues 22-23): Verify hover. Tighten spacing if needed.
### 8C. Button hover (Issue 18): Already correct. No change needed.
### 8D. Dynamic OG Image (Issue 29): New file app/api/og/route.tsx with ImageResponse. Update generateMetadata.
### 8E. PageTransition integration (Issue 24): Wrap page content.

---

## New Files (7)
1. components/effects/fade-up.tsx
2. components/effects/stagger-container.tsx
3. components/articles/sidebar-related.tsx
4. components/sidebar/market-snapshot.tsx
5. app/archive/page.tsx
6. components/archive/archive-content.tsx
7. app/api/og/route.tsx

## Modified Files (9)
1. app/globals.css
2. package.json
3. components/layout/navbar.tsx
4. components/layout/footer.tsx
5. components/home-content.tsx
6. app/page.tsx
7. app/posts/[slug]/page.tsx
8. app/layout.tsx
9. app/subscribe/page.tsx

## Dependency Order
Phases 1-4: independent, parallel
Phase 5: needs 3+4
Phase 6: needs 3+4
Phase 7: needs 1-4
Phase 8: needs 7
