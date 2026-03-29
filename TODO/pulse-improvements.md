# AI Pulse Page Improvements

**Status:** PLANNED
**Priority:** HIGH
**Depends on:** pulse-pipeline-agent.md, case-study-agent.md

## What exists now
- /pulse page with 7 sections (hero, map, adoption chart, ROI chart, red flags, case studies, industry donut)
- Supabase tables created (002_pulse_tables.sql) — empty, using seed data fallback
- API routes: /api/pulse/ and /api/pulse/snapshot/
- Sidebar widget (MarketSnapshot) uses hardcoded data

## What needs to happen

### Data layer
- [ ] Seed Supabase tables with curated real data (seed script exists at lib/pulse/seed-data.ts)
- [ ] Build Pulse Pipeline Agent for weekly automated refresh (spec: pulse-pipeline-agent.md)
- [ ] Connect MarketSnapshot sidebar widget to /api/pulse/snapshot/ (currently hardcoded fallback)

### Editor's Picks system
- [ ] Build engagement tracker (localStorage time-on-page per article)
- [ ] 24-hour rotation + 7-day cooldown logic
- [ ] Google Trends integration (google-trends-api npm package) for relevance scoring
- [ ] EditorsPicks client component on homepage

### Map interactions
- [ ] Country hover tooltips with detailed stats
- [ ] Click country to filter case studies below
- [ ] Year filter on adoption chart

### Polish
- [ ] Data source citations on each section
- [ ] Mobile polish: map → ranked list at all breakpoints
- [ ] Loading skeleton refinement
