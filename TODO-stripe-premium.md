# Stripe Premium Tiers — Implementation Plan

## Overview
Add paid premium tiers for specialists: Featured ($149/mo) and Spotlight ($349/mo).
Premium specialists get badge, sort boost, and enhanced visibility in the directory.

## Prerequisites
- [ ] Create Stripe account at stripe.com
- [ ] Get API keys (publishable + secret) from Stripe Dashboard > Developers > API Keys
- [ ] Set env vars: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- [ ] Add env vars to Vercel (production + preview)

## Step 1: Install & Configure
```bash
npm install stripe @stripe/stripe-js
```

Create `lib/stripe.ts`:
```typescript
import Stripe from "stripe";
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

## Step 2: Create Stripe Products
In Stripe Dashboard (or via API):
- **Product 1:** "Featured Specialist" — $149/month recurring
- **Product 2:** "Spotlight Specialist" — $349/month recurring
Save the price IDs (e.g., `price_xxx`) as constants.

## Step 3: Database Changes
Migration `009_stripe_premium.sql`:
```sql
ALTER TABLE specialists ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE specialists ADD COLUMN premium_tier TEXT CHECK (premium_tier IN ('featured', 'spotlight'));
ALTER TABLE specialists ADD COLUMN premium_expires_at TIMESTAMPTZ;
ALTER TABLE specialists ADD COLUMN stripe_subscription_id TEXT;
```

## Step 4: API Routes

### `app/api/billing/checkout/route.ts`
- POST: Creates Stripe Checkout Session
- Requires specialist auth (verifySpecialist)
- Body: `{ tier: "featured" | "spotlight" }`
- Creates/retrieves Stripe Customer (using specialist email)
- Returns `{ url: session.url }` for redirect

### `app/api/billing/portal/route.ts`
- POST: Creates Stripe Customer Portal session
- Requires specialist auth
- Returns `{ url: portalSession.url }` for managing subscription

### `app/api/webhooks/stripe/route.ts`
- POST: Stripe webhook handler (no auth — verified via webhook signature)
- Handle events:
  - `checkout.session.completed` → activate premium tier
  - `customer.subscription.updated` → update tier/status
  - `customer.subscription.deleted` → remove premium tier
  - `invoice.payment_failed` → flag for follow-up

## Step 5: Dashboard Billing Page

### `app/dashboard/billing/page.tsx`
- Show current tier (Free / Featured / Spotlight)
- Upgrade buttons linking to Checkout
- "Manage Subscription" button linking to Customer Portal
- Billing history (from Stripe)

### Component: `components/dashboard/billing-card.tsx`
- Current plan display
- Feature comparison table
- Upgrade CTA

## Step 6: Directory Integration

### Premium sort boost
In `app/api/specialists/route.ts`, the query already sorts by `is_featured` first.
Add `premium_tier` to sort: spotlight > featured > free.

### Premium badges
In `specialist-card.tsx`, show a "Featured" or "Spotlight" badge based on `premium_tier`.

### Homepage carousel (Spotlight only)
Add a "Spotlight Specialists" section to the homepage showing spotlight-tier specialists.

## Step 7: Premium Features by Tier

| Feature | Free | Featured ($149/mo) | Spotlight ($349/mo) |
|---------|------|---------------------|---------------------|
| Directory listing | Yes | Yes | Yes |
| Lead inbox | Yes | Yes | Yes |
| Analytics | Basic | Full | Full |
| "Featured" badge | No | Yes | Yes |
| Sort priority | Normal | Boosted | Top |
| Homepage carousel | No | No | Yes |
| Category top placement | No | No | Yes |
| Profile views in search | Standard | 2x visibility | 5x visibility |

## Step 8: Webhook Security
- Verify webhook signatures using `stripe.webhooks.constructEvent()`
- Add `STRIPE_WEBHOOK_SECRET` to env vars
- Set webhook endpoint in Stripe Dashboard: `https://theparticlepost.com/api/webhooks/stripe`
- Subscribe to events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`

## Estimated Effort
- Stripe setup + checkout: 4h
- Webhook handler: 3h
- Dashboard billing page: 3h
- Directory premium integration: 2h
- Testing end-to-end: 2h
- **Total: ~14h**

## Revenue Model
- Break-even at 1 premium specialist (covers $65/mo infra)
- Month 3 target: 10 premium @ $149 = $1,490 MRR
- Month 6 target: 30 premium @ avg $200 = $6,000 MRR
