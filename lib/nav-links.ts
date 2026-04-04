/**
 * Shared navigation links for header and footer.
 * Single source of truth — add pages here and both nav + footer update.
 */

export const SITE_NAV_LINKS = [
  { href: "/", label: "Briefings" },
  { href: "/categories/", label: "Deep Dives" },
  { href: "/pulse/", label: "AI Pulse" },
  { href: "/specialists/", label: "Specialists" },
  { href: "/archive/", label: "Archive" },
];

export const FOOTER_NAV_LINKS = [
  ...SITE_NAV_LINKS,
  { href: "/about/", label: "About" },
  { href: "/subscribe/", label: "Subscribe" },
];

export const LEGAL_LINKS = [
  { href: "/privacy/", label: "Privacy" },
  { href: "/terms/", label: "Terms" },
  { href: "/cookies/", label: "Cookies" },
];
