import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/categories/", label: "Categories" },
  { href: "/about/", label: "About" },
];

const LEGAL_LINKS = [
  { href: "/privacy/", label: "Privacy" },
  { href: "/terms/", label: "Terms" },
  { href: "/cookies/", label: "Cookies" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-bg-secondary/50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="font-display text-lg">Particle Post</span>
            </div>
            <p className="text-body-sm text-foreground-secondary max-w-xs">
              AI-powered insights at the intersection of finance, technology,
              and energy.
            </p>
          </div>

          {/* Navigate */}
          <div>
            <h4 className="text-body-xs font-semibold uppercase tracking-widest text-foreground-muted mb-4">
              Navigate
            </h4>
            <nav aria-label="Site navigation" className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-body-sm text-foreground-secondary hover:text-accent transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-body-xs font-semibold uppercase tracking-widest text-foreground-muted mb-4">
              Legal
            </h4>
            <nav aria-label="Legal" className="flex flex-col gap-2">
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-body-sm text-foreground-secondary hover:text-accent transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-body-xs text-foreground-muted">
            &copy; {year} Particle Post. All rights reserved.
          </p>
          <p className="text-body-xs text-foreground-muted">
            Built with AI. Curated by humans.
          </p>
        </div>
      </div>
    </footer>
  );
}
