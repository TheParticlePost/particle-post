import Link from "next/link";
import { FooterSubscribe } from "@/components/newsletter/footer-subscribe";

const NAV_LINKS = [
  { href: "/", label: "Briefings" },
  { href: "/categories/", label: "Deep Dives" },
  { href: "/archive/", label: "Archive" },
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
    <footer className="bg-bg-deep">
      {/* 2px vermillion rule at top — DESIGN.md signature element */}
      <div className="h-[2px] bg-accent" />

      <div className="max-w-container mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="font-display text-lg font-bold uppercase tracking-[-0.02em] text-accent">
                Particle Post
              </span>
            </div>
            <p className="text-body-sm text-text-secondary max-w-xs">
              Particle Post helps business leaders implement AI. Twice-daily
              briefings on strategy, operations, and the decisions that matter.
            </p>
          </div>

          {/* Navigate */}
          <div>
            <h4 className="font-mono text-caption font-medium uppercase tracking-widest text-text-muted mb-4">
              Navigate
            </h4>
            <nav aria-label="Site navigation" className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-mono text-data text-text-secondary hover:text-accent transition-colors duration-[180ms] ease-kinetic"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-mono text-caption font-medium uppercase tracking-widest text-text-muted mb-4">
              Legal
            </h4>
            <nav aria-label="Legal" className="flex flex-col gap-2">
              {LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-mono text-data text-text-secondary hover:text-accent transition-colors duration-[180ms] ease-kinetic"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Subscribe */}
          <FooterSubscribe />
        </div>

        {/* Bottom — spacing only, no border (No-Line Rule) */}
        <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono text-caption text-text-muted">
            &copy; {year} Particle Post. All rights reserved.
          </p>
          <p className="font-mono text-caption text-text-muted">
            Research-grade intelligence. Delivered daily.
          </p>
        </div>
      </div>
    </footer>
  );
}
