---
name: validate-article
description: Run quality checks on a published or just-generated Particle Post article. Checks schema, word count, GSO structure, internal links, image quality, AI-tell phrases, H2 quality, visual diversity, and post_index registration.
allowed-tools: Read, Bash
argument-hint: "[post-slug]  (blank = most recent post)"
---

!`ls "blog/content/posts/" 2>&1 | sort -r | head -5`

# Particle Post — 12-Point Article Audit

## Instructions

1. **Find the article** — If `$ARGUMENTS` is provided, find the matching `.md` file in `blog/content/posts/`. If blank, use the most recent file from the pre-loaded list.

2. **Read the article** with the Read tool.

3. **Run all 12 checks** below. Start at 100 points, deduct for each failure.

## 12-Point Checklist

| # | Check | Method | Pass Criteria | Penalty |
|---|-------|--------|---------------|---------|
| 1 | Frontmatter completeness | Check YAML fields | title, date, slug, description, categories, cover.image all present and non-empty | -20 |
| 2 | Cover image source | Check cover.image URL | No `picsum.photos` in URL | -15 |
| 3 | Word count | Count words in body only (after second `---`) | TOF: 600-1000, MOF: 1800-3000, BOF: 1200-2000 | -20 |
| 4 | Source attribution | Count "according to", "per ", "reported", "[Source] says" | At least 3 inline citations | -20 |
| 5 | AI-tell scan | Search for banned phrases | 0 matches for: delve, game-changing, transformative, groundbreaking, unprecedented, utilize, seamlessly, furthermore, moreover, needless to say, rest assured, it's worth noting | -10 per phrase (max -20) |
| 6 | Article structure | Count `## ` headings | At least 2 H2 headings | -10 |
| 7 | Lede quality | Read first 2 sentences | Names a specific company, person, dollar amount, or date | -15 |
| 8 | Answer-first structure | Read paragraph after first H2 | Direct declarative statement, 40-60 words, no question or setup phrase | -5 |
| 9 | FAQ section | Check for "Frequently Asked Questions" | Present if `has_faq: true` in frontmatter | -5 |
| 10 | Internal links | Count markdown links to `/posts/` | TOF: min 1, MOF: min 2, BOF: min 1 | -10 |
| 11 | H2 quality | Read all H2 headings | No generic H2s: "Background", "Analysis", "Discussion", "Overview", "Key Developments", "Market Analysis", "Introduction", "Context" | -10 if 2+ generic |
| 12 | Visual diversity | Check for stat-box shortcode + blockquote | At least 1 `stat-box` AND 1 blockquote. MOF/BOF: 2+ stat-boxes | -5 |

## Output Format

```
ARTICLE AUDIT: [article-title]
═══════════════════════════════════════

 #  Check                  Result   Notes
──  ─────────────────────  ──────   ─────
 1  Frontmatter            PASS
 2  Cover Image            PASS
 3  Word Count             FAIL     423 words (TOF min: 600)
...
12  Visual Diversity       WARN     No stat-box found

SCORE: 75/100 — PASS (threshold: 65)

FIX NEEDED:
- Word count: Add 177+ words to reach TOF minimum of 600
- Visual diversity: Add at least 1 stat-box shortcode
```

4. **Check post_index** — Read `pipeline/config/post_index.json` and verify the slug appears in the index. If not: WARN "Article not registered in post_index.json".
