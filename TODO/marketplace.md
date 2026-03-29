# AI Services Marketplace

**Status:** PLANNED
**Priority:** HIGH
**Depends on:** Stripe integration, Supabase schema extension

## Overview
A marketplace where business owners describe what AI services they need, and we match them with vetted professionals. Revenue model: charge vendors per qualified lead.

## Major components

### A. User profiles (two types)
- **Buyers** (business owners): company, industry, size, AI maturity, budget, service needs
- **Vendors** (professionals): company/individual, services offered, pricing, portfolio, certifications, availability, geography

### B. Service request form
- Categories: Strategy Consulting, Implementation, Data Engineering, MLOps, Training, Audit/Compliance
- Budget range, timeline, company size, industry
- Free-text description
- Stored in Supabase, triggers matching

### C. Matching algorithm
- Hard filters: service category, budget range
- Weighted scoring: industry experience, geographic fit, availability, ratings, portfolio relevance
- Claude API for semantic matching (portfolio vs. request description)
- Return top 3-5 matches with score explanation

### D. Vendor dashboard
- `/dashboard/vendor/` — protected route
- Incoming leads, accept/decline, pipeline tracking
- Profile management, analytics (leads, conversion, revenue)

### E. Notifications
- Email to vendors on match (Resend/SendGrid — shared with outreach system)
- Email to buyers when vendors accept
- In-app notification badges

### F. Lead billing (Stripe)
- Stripe Connect for marketplace payments
- Per-lead or monthly billing
- Invoice generation and tracking

## Supabase tables
- `marketplace_buyers`
- `marketplace_vendors`
- `marketplace_requests`
- `marketplace_matches`
- `marketplace_invoices`

## API keys needed
- Stripe API key + Stripe Connect
- Email provider (shared with outreach system)
