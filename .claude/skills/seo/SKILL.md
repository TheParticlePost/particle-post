---
name: seo
description: Run SEO audits, check schema markup, analyze E-E-A-T signals, validate GEO/AEO optimization, and plan keyword strategy for Particle Post articles and site-wide SEO.
allowed-tools: Read, Bash, WebSearch, WebFetch
argument-hint: "audit | page [slug] | schema | geo [slug] | content [slug] | plan"
---

!`cat "pipeline/config/seo_guidelines.md" 2>/dev/null || echo "(seo_guidelines.md not found)"`
!`cat "pipeline/config/seo_gso_config.json" 2>/dev/null || echo "(seo_gso_config.json not found)"`

# Particle Post — SEO Toolkit

## Sub-Commands

### `/seo audit` — Full site SEO audit
1. Read `blog/config.yml` or `blog/hugo.toml` for site metadata
2. Check `blog/static/robots.txt` for AI crawler directives
3. Check `blog/static/llms.txt` and `blog/static/llms-full.txt` exist
4. Read `blog/layouts/partials/extend_head.html` for schema markup (BreadcrumbList, FAQPage, Article)
5. Verify sitemap exists at the expected path
6. Check 5 most recent articles for: meta_title < 60 chars, meta_description < 155 chars, primary keyword in H1
7. Report: score /100 with specific issues and fixes

### `/seo page [slug]` — Single article SEO analysis
1. Find and read the article from `blog/content/posts/`
2. Check: title tag length, meta description, H1 keyword placement, H2 keyword distribution
3. Check: internal links count and quality, external links, image alt text
4. Check: schema_type in frontmatter, has_faq flag, faq_pairs quality
5. E-E-A-T signals: author attribution, source citations, data specificity
6. Report with specific improvement suggestions

### `/seo schema` — Validate JSON-LD schema markup
1. Read `blog/layouts/partials/extend_head.html`
2. Verify: BreadcrumbList schema (all pages), Article/NewsArticle schema (article pages), FAQPage schema (when has_faq=true)
3. Check field completeness: @type, headline, datePublished, author, publisher, wordCount, articleSection
4. Flag missing or malformed fields

### `/seo geo [slug]` — GEO/AEO (Generative Engine Optimization) check
1. Read the article
2. Check answer-first structure: direct answer within first 60 words after H1
3. Check FAQ section: 3+ Q&A pairs, self-contained answers under 50 words each
4. Check entity coverage: named companies, people, numbers, dates
5. Check sub-query coverage: does article address related questions an AI would ask?
6. Check citation density: inline attributions for AI extraction
7. CITE framework: Credibility, Informativeness, Timeliness, Engagement

### `/seo content [slug]` — Content quality for SEO
1. Read the article
2. Check: keyword density (1-3%), LSI/semantic keywords, heading hierarchy
3. Check: readability (sentence length avg, paragraph length)
4. Check: content freshness signals, data recency
5. Compare against `seo_guidelines.md` keyword targets

### `/seo plan` — Keyword strategy planning
1. Read current `seo_gso_config.json` — keyword targets, content gaps, schema coverage
2. Read `pipeline/config/post_index.json` — all published articles
3. Identify: keyword cannibalization risks, content gaps, trending opportunities
4. Read `seo_guidelines.md` for current targets
5. Suggest: next 5 keyword targets with search intent, suggested funnel type, and article angle

## CORE-EEAT Framework (apply to all audits)
- **C**redibility: Author expertise, source quality, citation density
- **O**riginality: Unique analysis, not just aggregation
- **R**elevance: Keyword alignment, search intent match
- **E**xperience: First-hand data, specific examples
- **E**xpertise: Domain authority signals
- **A**uthoritativeness: Backlink-worthy content, entity coverage
- **T**rustworthiness: Fact-checkable claims, transparent sourcing
