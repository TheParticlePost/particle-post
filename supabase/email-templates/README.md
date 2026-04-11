# Supabase auth emails — setup

This folder contains brand-aligned HTML templates for every Supabase auth email
Particle Post sends. The palette, fonts, and copy match `DESIGN.md` — Rich
Black background, Vermillion accent, editorial-stripe header, Sora / DM Sans /
IBM Plex Mono stack, `contact@theparticlepost.com` as the contact address.

Three things need to happen in the Supabase dashboard to actually ship these
emails to users. Templates alone are not enough — without custom SMTP, Supabase
will keep sending from `noreply@mail.app.supabase.io` and the redirect links
will keep pointing at `localhost:3000`.

---

## 1. Fix the broken verification link (Site URL + redirect allow-list)

**Symptom:** clicking "Verify email address" in a confirmation email lands on
`http://localhost:3000/...` and Chrome shows `ERR_CONNECTION_REFUSED`.

**Cause:** the Supabase project's `Site URL` is still set to `http://localhost:3000`
(the default when you first spun up the project). Supabase inserts that value
into every `{{ .ConfirmationURL }}` it emits.

**Fix (takes 60 seconds):**

1. Open https://supabase.com/dashboard → your Particle Post project
2. Left nav → **Authentication** → **URL Configuration**
3. Set **Site URL** to:
   ```
   https://theparticlepost.com
   ```
4. Add the following entries to the **Redirect URLs** allow-list (one per
   line). Supabase only honors `redirect_to` values that match one of these
   entries, so missing any of them will silently downgrade to the Site URL:
   ```
   https://theparticlepost.com/**
   https://www.theparticlepost.com/**
   https://*-theparticlepost.vercel.app/**
   http://localhost:3000/**
   ```
   Keep the `localhost:3000` wildcard so local dev signups still work.
5. Click **Save changes** at the bottom.

After this, any new confirmation email will link to
`https://theparticlepost.com/auth/confirm?...` instead of localhost.

> ⚠️ Existing verification emails that were sent before the Site URL change
> are already baked — the user will need to request a new confirmation to get
> a working link. You can resend from the Supabase dashboard:
> **Authentication → Users → pick the user → three-dot menu → Send Magic Link**.

---

## 2. Fix the sender address (custom SMTP so `From` is `contact@theparticlepost.com`)

**Symptom:** every auth email arrives from `Supabase Auth
<noreply@mail.app.supabase.io>` and lands in "Promotions" or spam.

**Cause:** Supabase's default SMTP has a ~4 email/hour rate limit, always
sends from `noreply@mail.app.supabase.io`, and cannot be customised. You have
to plug in your own transactional email provider.

### Recommended: Resend (simplest for a Vercel/Next.js stack)

1. Sign up at https://resend.com (free tier: 3,000 emails/month, 100/day)
2. **Domains → Add Domain → `theparticlepost.com`**
3. Resend gives you 4 DNS records (SPF, DKIM x2, MX for bounce handling). Add
   them to the DNS provider for `theparticlepost.com`. Resend usually verifies
   in 5-10 minutes.
4. Once the domain shows **Verified**, go to **API Keys → Create API Key**.
   Give it a single-project scope (Sending access only, for the verified
   domain). Copy the key — you only see it once.
5. Back in Supabase: **Project Settings → Authentication → SMTP Settings →
   Enable Custom SMTP**, and fill in:
   | Field | Value |
   |---|---|
   | Sender email | `contact@theparticlepost.com` |
   | Sender name | `Particle Post` |
   | Host | `smtp.resend.com` |
   | Port number | `465` |
   | Username | `resend` |
   | Password | `re_...` (the API key from step 4) |
   | Minimum interval | `1` (seconds — default is fine) |
6. Click **Save** and use the **Send test email** button to confirm delivery.

Alternatives if you prefer:
- **Postmark** — `smtp.postmarkapp.com`, port 587, username = server token
- **AWS SES** — requires SMTP credentials from IAM, longer setup but cheapest
  at scale (~$0.10 per 1k)
- **SendGrid** — works fine, historically more spam filtering issues

Any provider that exposes plain SMTP credentials will work. The key point is
that the sender domain (`theparticlepost.com`) is verified via SPF + DKIM at
the DNS level, otherwise Gmail/Outlook will mark the email as spam no matter
how clean the HTML is.

---

## 3. Apply the branded templates

1. Supabase dashboard → **Authentication → Email Templates**
2. For each of the 6 template tabs, paste the matching HTML from this folder:
   | Dashboard tab | File |
   |---|---|
   | **Confirm signup** | `confirm-signup.html` |
   | **Invite user** | `invite-user.html` |
   | **Magic Link** | `magic-link.html` |
   | **Change Email Address** | `change-email.html` |
   | **Reset Password** | `reset-password.html` |
   | **Reauthentication** | `reauthentication.html` |
3. While you're in each tab, also set the **subject line**:
   | Template | Subject |
   |---|---|
   | Confirm signup | `Confirm your email · Particle Post` |
   | Invite user | `You've been invited to Particle Post` |
   | Magic Link | `Your sign-in link · Particle Post` |
   | Change Email | `Confirm your new email · Particle Post` |
   | Reset Password | `Reset your password · Particle Post` |
   | Reauthentication | `Your verification code · Particle Post` |
4. Click **Save** on each tab.

Supabase expands these Go template variables at send time, so leave them
literally in the HTML:
- `{{ .ConfirmationURL }}` — the link the user clicks
- `{{ .Token }}` — the 6-digit code (reauthentication template only)
- `{{ .Email }}` / `{{ .NewEmail }}` — used in change-email

---

## 4. Verify end-to-end

1. Create a fresh test account at `https://theparticlepost.com/signup` with a
   throwaway Gmail address.
2. Expected result:
   - Inbox, not spam
   - `From: Particle Post <contact@theparticlepost.com>`
   - Rich Black background, vermillion button, Sora headline, Particle Post
     footer with `contact@theparticlepost.com`
   - Click "Verify email address" → lands on `theparticlepost.com` (not
     localhost) and the account becomes active
3. If it still lands in spam, the DNS records from step 2 haven't propagated
   or SPF is misaligned — check https://mxtoolbox.com/SuperTool.aspx for
   `theparticlepost.com` SPF / DKIM / DMARC records.

---

## Known gotchas

- **Resend free tier = 100 emails/day.** For a pre-launch newsletter that's
  plenty, but if a signup campaign spikes you'll get throttled. Upgrade to
  the $20/month Pro tier for 50k/month when needed.
- **DMARC policy.** Once SPF + DKIM are verified, add a DMARC record too so
  Gmail trusts the domain more aggressively:
  ```
  _dmarc.theparticlepost.com  TXT  "v=DMARC1; p=quarantine; rua=mailto:contact@theparticlepost.com"
  ```
  Start with `p=none` for a week to monitor, then tighten to `p=quarantine`.
- **Supabase rate-limit on default SMTP.** If you skip custom SMTP, Supabase's
  built-in sender is capped at 4 emails/hour. Any real launch will hit that
  ceiling immediately.
- **Redirect URL allow-list is strict.** Supabase does exact-plus-wildcard
  matching. `https://theparticlepost.com` alone will NOT match
  `https://theparticlepost.com/auth/confirm` — you need the trailing `/**`.
