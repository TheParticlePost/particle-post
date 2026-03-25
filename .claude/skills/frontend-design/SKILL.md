---
name: frontend-design
description: Design and implement production-grade UI changes for Particle Post. Anti-generic-AI aesthetic, bold typography, editorial density. Loads live CSS and design principles. Use for any visual change, CSS modification, or template update.
allowed-tools: Read, Edit, Bash
---

!`cat "blog/assets/css/extended/custom.css" 2>/dev/null || echo "(custom.css not found)"`
!`cat "pipeline/prompts/ui_design_principles.txt" 2>/dev/null || echo "(ui_design_principles.txt not yet created)"`

# Particle Post — Frontend Design System

## Design Philosophy

You are designing for a **premium financial editorial publication** (Stratechery / Morning Brew / Bloomberg aesthetic). The audience is CFOs, analysts, and institutional investors.

### Anti-Slop Rules (from taste-skill)
- NO generic AI aesthetic (gradient backgrounds, rounded everything, pastel colors)
- NO low-density layouts with excessive whitespace
- NO decorative elements that don't serve information hierarchy
- BOLD typography decisions — large headlines, tight leading on display text
- HIGH information density — editorial grid, not landing page
- REAL contrast — dark darks, light lights, intentional color use
- MOTION with purpose — only animate what needs attention

### Protected Brand Values
```
--accent-blue:  #2563EB   (primary CTA, links, headings accent, logo)
--accent-amber: #F59E0B   (stat-box numbers and data highlights only)
```
These NEVER change. Period. No exceptions. No "slight adjustments."

### CSS Token Reference (from pre-loaded custom.css)
The live CSS is loaded above. Reference it for exact current values.

**Light mode tokens**: --theme, --entry, --primary, --secondary, --tertiary, --content, --border
**Dark mode tokens**: Same vars under `[data-theme="dark"]` block

Rule: ALWAYS use CSS custom properties. Never set color values directly except for established hover states.

### Typography
```
--font-body:    'Inter', ui-sans-serif, system-ui
--font-heading: 'Plus Jakarta Sans', ui-sans-serif, system-ui
--font-mono:    ui-monospace, 'Cascadia Code', 'Fira Code'
```
Do NOT introduce new font families. Use clamp() for fluid sizing — never flatten to fixed px.

### Layout
```
--nav-width: 1100px  |  --gap: 24px
Post grid: repeat(2, 1fr) — collapses at 640px
Desktop-first breakpoints: 768px (major), 640px (grid)
```

### Accessibility (WCAG AA)
- 4.5:1 contrast minimum for normal text
- 3:1 for large text and UI components
- 44x44px minimum touch targets
- All animations need `prefers-reduced-motion` override
- Never remove focus indicators without replacement

### Component Inventory
Key components: logo wordmark, nav, home hero, post card grid, article single, stat-box, TOC, tags, footer, cookie banner, filter tabs, category pills, blockquotes, subscribe form, breadcrumb.

Brand-critical (never modify):
- Blue left-border on H2: `border-left: 3px solid var(--accent-blue)`
- `.stat-number` color: `var(--accent-amber)`
- `.category-pill` color: `var(--accent-blue)`

### Workflow
1. **READ**: Live CSS is pre-loaded above — find the exact current value
2. **IDENTIFY**: Use component inventory to locate the precise selector
3. **VERIFY**: Check both light AND dark mode. Check contrast ratios.
4. **EDIT**: Use Edit tool on `blog/assets/css/extended/custom.css` or templates in `blog/layouts/`
5. **VERIFY**: Run `git diff blog/assets/css/extended/custom.css` to confirm
6. **DARK MODE**: If you changed a light-mode value, check if `[data-theme="dark"]` needs a parallel update

### NEVER
- Change --accent-blue or --accent-amber
- Introduce new font families
- Use px where clamp() exists
- Add !important
- Change the 2-col grid without user confirmation
- Remove existing hover/focus states

### UI Designer Agent Bridge
The CrewAI UI Designer agent reads `pipeline/prompts/ui_design_principles.txt` at creation time. To update its design knowledge, edit that file — changes propagate on next automated run.
