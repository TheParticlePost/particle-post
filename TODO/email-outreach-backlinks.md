# Email Outreach System for Backlinks

**Status:** PLANNED
**Priority:** MEDIUM
**Depends on:** Email provider setup (Resend or SendGrid), contact finder API

## Overview
Automated outreach pipeline that identifies backlink opportunities from published articles, finds contacts, generates personalized outreach emails, sends them, and tracks results.

## Architecture

### 1. Email provider integration
- Integrate Resend (modern, Next.js-native) or SendGrid
- Verify theparticlepost.com domain (DKIM/SPF/DMARC)
- Transactional email for outreach + follow-ups

### 2. Backlink prospecting agent (CrewAI pipeline)
- Scan new articles for outbound link opportunities
- Identify relevant sites/blogs in AI/business space
- Find contact emails via Hunter.io or Apollo API
- Generate personalized outreach using Claude API
- Score prospect relevance

### 3. Outreach pipeline
- GitHub Action or Supabase Edge Function
- Flow: prospect discovery → email generation → send → track opens/replies
- Follow-up sequences (day 3, day 7)
- Backlink monitoring (check if links were placed)

### 4. Supabase tables
- `outreach_prospects` — domain, contact_email, status, relevance_score
- `outreach_emails` — prospect_id, subject, body, sent_at, opened_at, replied_at
- `backlinks` — source_url, target_article_slug, status, discovered_at

## API keys needed
- Email provider (Resend/SendGrid)
- Contact finder (Hunter.io/Apollo)
- Domain DNS access for verification
