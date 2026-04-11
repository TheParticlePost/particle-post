/**
 * Canonical site URL for auth redirect targets.
 *
 * Supabase bakes the string we pass as `emailRedirectTo` / `redirectTo`
 * directly into the confirmation link in the outgoing email. If we naively
 * pass `window.location.origin`, signups triggered from local dev end up
 * emailing the user a link to `http://localhost:3000/...`, which obviously
 * breaks for the recipient.
 *
 * Rule of thumb:
 *   - In production builds we always redirect to the canonical HTTPS domain.
 *   - In local dev you can override with `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
 *     in `.env.local` if you're testing the full flow against a throwaway inbox.
 */
const FALLBACK_SITE_URL = "https://theparticlepost.com";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK_SITE_URL;
  // Strip trailing slash so callers can safely append their own path
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function getAuthRedirectUrl(path: string): string {
  const base = getSiteUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
