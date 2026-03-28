# Case Study Agent — Automated Deep Case Study Generation

## Purpose
Generate in-depth case study articles from company AI implementation data,
then link them to the /pulse map as geographic case study points.

## Architecture
Triggered by the Pulse Pipeline Agent when a new case study is identified:

1. **Research phase**: Claude researches the company's AI implementation using:
   - Company press releases and earnings calls
   - Industry analysis reports
   - Technical documentation (if public)
   - Media coverage

2. **Writing phase**: Generates a long-form article (1500-3000 words) following
   the Particle Post editorial style:
   - Clear, direct language for non-native English readers
   - Implementation focus (not just outcomes)
   - Actionable takeaways for executives
   - Data callouts with specific metrics

3. **Publishing phase**:
   - Creates markdown file in `blog/content/posts/`
   - Adds cover image via Pixabay/Pexels API
   - Registers in `pulse_case_studies` table with:
     - Company name, lat/lng coordinates
     - Industry, outcome metric
     - Slug linking to the new article
   - Commits and pushes to trigger Vercel deployment

## Integration Points
- `pulse_case_studies` Supabase table (slug field links map → article)
- `blog/content/posts/` directory (markdown articles)
- Existing article pipeline patterns in `pipeline/`

## Status: NOT YET BUILT
Priority: Low (manual case study creation sufficient for now)
Depends on: Pulse Pipeline Agent being operational first
