import type { Metadata } from "next";
import Link from "next/link";
import { OverlineLabel } from "@/components/ui/overline-label";
import { SubscribeForm } from "@/components/newsletter/subscribe-form";

export const metadata: Metadata = {
  title: "Subscribe",
  description:
    "The AI briefing 12,000 leaders read before markets open. Free, twice daily.",
};

export default function SubscribePage() {
  return (
    <div className="min-h-screen">
      {/* Minimal nav — logo only */}
      <nav className="h-16 flex items-center px-6 max-w-container mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent" />
          <span className="font-display text-lg font-bold uppercase tracking-[-0.02em] text-accent">
            Particle Post
          </span>
        </Link>
      </nav>

      {/* Hero — centered (exception to left-align rule) */}
      <section className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <OverlineLabel className="mb-6 block">Twice Daily · Free</OverlineLabel>

          <h1 className="font-display text-display-hero text-text-primary mb-6 tracking-[-0.02em]">
            The AI briefing that helps leaders make better decisions.
          </h1>

          <p className="text-body-lg text-text-secondary mb-8 max-w-lg mx-auto">
            Implementation strategies and operational intelligence — in your inbox
            before your first meeting.
          </p>

          <div className="max-w-md mx-auto mb-4">
            <SubscribeForm />
          </div>

          <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
            Free forever. No spam. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* Social proof — bg shift */}
      <section className="bg-bg-deep py-16 px-4 sm:px-6">
        <div className="max-w-container mx-auto text-center">
          <p className="font-mono text-data text-text-secondary uppercase tracking-widest mb-8">
            Trusted by leaders at
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {["Company A", "Company B", "Company C", "Company D", "Company E"].map(
              (name) => (
                <div
                  key={name}
                  className="w-24 h-8 bg-bg-bright/50 rounded-lg"
                  aria-label={name}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* What you get — 3 cards */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                title: "Morning Briefing",
                description:
                  "The essential AI and market signals you need before 9 AM. Research-grade insights in under 5 minutes.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                ),
                title: "Evening Recap",
                description:
                  "Market close analysis and after-hours developments. What moved, why it matters, and what to watch tomorrow.",
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
                title: "Weekly Deep Dive",
                description:
                  "Long-form analysis on a single strategic topic. The piece your board will forward to each other.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-bg-container border border-border-ghost rounded-lg p-6
                           hover:border-accent transition-colors duration-[180ms] ease-kinetic"
              >
                <div className="text-accent mb-4">{card.icon}</div>
                <h3 className="font-display text-display-sm text-text-primary mb-2">
                  {card.title}
                </h3>
                <p className="text-body-sm text-text-secondary">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-display-xl text-text-primary mb-6 tracking-[-0.02em]">
            Join now. Your first briefing arrives tomorrow morning.
          </h2>
          <div className="max-w-md mx-auto mb-4">
            <SubscribeForm />
          </div>
          <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest">
            Free forever. No spam. Unsubscribe anytime.
          </p>
        </div>
      </section>
    </div>
  );
}
