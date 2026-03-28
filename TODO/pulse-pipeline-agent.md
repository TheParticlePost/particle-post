# Pulse Pipeline Agent — Automated Data Refresh

## Purpose
Weekly automated refresh of the /pulse dashboard data from public AI reports.

## Architecture
GitHub Action on a weekly cron (Sunday 6 AM UTC) that:

1. **Scrapes/downloads** publicly available AI report PDFs and data pages:
   - McKinsey State of AI (annual)
   - Stanford HAI AI Index (annual)
   - OECD AI Observatory (quarterly)
   - Company earnings calls (weekly)
   - Industry press releases (daily)

2. **Extracts structured data** using Claude API:
   - Country adoption rates and spend figures
   - Industry ROI multipliers
   - New case studies with geographic coordinates
   - Risk/red flag indicators

3. **POSTs extracted data** to `/api/pulse/seed/` endpoint:
   - Uses SUPABASE_SERVICE_ROLE_KEY stored as GitHub secret
   - Upserts into pulse_* tables
   - Validates data integrity before writing

4. **Verifies** the /pulse page renders correctly after update

## Integration Point
The `/api/pulse/seed/` endpoint (already built) is the sole ingestion API.

## GitHub Secrets Needed
- ANTHROPIC_API_KEY (for Claude extraction)
- SUPABASE_SERVICE_ROLE_KEY (for data writes)

## Status: NOT YET BUILT
Priority: Medium (current seed data is sufficient for launch)
