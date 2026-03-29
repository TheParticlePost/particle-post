# Content Type Expansion + Full Automation

**Status:** PLANNED
**Priority:** HIGH
**Depends on:** Pipeline agent modifications

## Current state
- ✅ Articles (morning/evening briefings) — automated via CrewAI
- ✅ Deep Dives (long-form analysis) — automated via CrewAI

## New content types

### Case Studies
- Spec exists: `TODO/case-study-agent.md`
- Structure: Company → Problem → AI Solution → Implementation → Results → Lessons
- Linked to /pulse map via coordinates
- Frontmatter: `content_type: "case-study"`

### DIY Guides
- Step-by-step implementation guides for AI use cases
- Structure: Prerequisites → Tools → Steps → Pitfalls → Expected Outcome
- Target: CTOs, VPs Engineering
- Frontmatter: `content_type: "diy-guide"`

### Tool Presentations / Reviews
- Vendor-neutral AI tool reviews
- Structure: Overview → Features → Pricing → Pros/Cons → Best For → Alternatives
- Use DataTable component for comparisons
- Frontmatter: `content_type: "tool-review"`

## Implementation

### Code changes
1. Add `content_type` to PostMeta in `lib/types.ts`
2. Update `lib/content.ts` to parse and filter by content_type
3. Content type badges on article cards
4. Browse pages: `/case-studies/`, `/guides/`, `/tools/`
5. Update sitemap and nav

### Pipeline changes
6. New CrewAI agents: Case Study Researcher, DIY Guide Writer, Tool Review Analyst
7. New task chains in `pipeline/tasks/`
8. New GitHub Action workflows for each type
9. New templates in `pipeline/config/`

## Automation goal
All 5 content types (articles, deep dives, case studies, guides, tool reviews) fully automated with human review gate.
