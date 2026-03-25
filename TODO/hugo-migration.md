# Platform Migration — Beyond Hugo

**Status:** EVALUATING
**Priority:** MEDIUM
**Target:** When dynamic features are needed

## Context

Hugo is excellent for static content but limits:
- No server-side rendering for personalization
- No dynamic features (comments, user accounts, real-time data)
- No API routes for integrations
- Limited interactive components

## Migration candidates

- **Next.js** — full React, SSR/SSG hybrid, API routes, Vercel hosting
- **Astro** — content-focused, partial hydration, supports React/Vue/Svelte islands
- **SvelteKit** — lighter than Next.js, excellent performance

## Preparation (already done)

- All UI/design skills installed (frontend-design, taste, ui-skills, design toolkit, Playwright)
- Design system documented in `pipeline/prompts/ui_design_principles.txt` (portable)
- CSS tokens are framework-agnostic (custom properties)
- Content is standard Markdown with YAML frontmatter (portable to any SSG/framework)

## When to migrate

- When we need user accounts, comments, or personalization
- When we need API routes for integrations
- When we need interactive data visualizations
- When the user decides to do a full redesign from scratch

## What agents need when migrating

- UI Designer agent tools must be updated for the new framework's file structure
- CSSEditorTool / TemplateEditorTool paths will change
- Formatter must output the new framework's content format
- Deploy workflow must change from GitHub Pages to Vercel/Cloudflare Pages
