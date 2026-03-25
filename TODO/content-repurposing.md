# Content Repurposing Pipeline

**Status:** PLANNED
**Priority:** MEDIUM

## Requirements

- Repurpose articles into social media posts (Twitter/X threads, LinkedIn)
- Generate newsletter digests from weekly articles
- Create thread-style summaries for Twitter/X
- Extract key quotes and statistics for shareable graphics

## Implementation notes

- New agent: `pipeline/agents/content_repurposer.py`
- New workflow: `.github/workflows/content-repurpose.yml`
- Runs daily after evening post
- Outputs to `pipeline/data/social_posts/` for manual review or auto-posting
