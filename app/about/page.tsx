import type { Metadata } from "next";
import { OverlineLabel } from "@/components/ui/overline-label";
import { DataText } from "@/components/ui/data-text";
import { FadeUp } from "@/components/effects/fade-up";
import { TAGLINE_LONG } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description: TAGLINE_LONG,
};

export default function AboutPage() {
  return (
    <div className="max-w-article mx-auto px-4 sm:px-6 py-16">
      <FadeUp>
        <OverlineLabel className="mb-4 block">About</OverlineLabel>
        <h1 className="font-display text-display-xl text-text-primary mb-8">
          About Particle Post
        </h1>

        <div className="prose">
          <p>
            Particle Post is a twice-daily publication that helps business leaders
            understand how AI changes the way companies operate. We cover
            implementation strategies, operational decisions, and the business
            impact of AI — written clearly enough for global executives reading
            in any language.
          </p>
        </div>
      </FadeUp>

      {/* How It Works */}
      <FadeUp delay={0.05}>
        <section className="mt-16">
          <OverlineLabel className="mb-4 block">How It Works</OverlineLabel>
          <h2 className="font-display text-display-lg text-text-primary mb-6">
            Two briefings. Every business day.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-bg-container border border-border-ghost rounded-lg p-6">
              <DataText className="text-accent block mb-2">08:00 AM</DataText>
              <h3 className="font-display text-display-sm text-text-primary mb-2">
                Morning Briefing
              </h3>
              <p className="text-body-sm text-text-secondary">
                The essential AI developments, implementation case studies, and
                strategic signals you need before your first meeting.
              </p>
            </div>
            <div className="bg-bg-container border border-border-ghost rounded-lg p-6">
              <DataText className="text-accent block mb-2">05:00 PM</DataText>
              <h3 className="font-display text-display-sm text-text-primary mb-2">
                Evening Wrap
              </h3>
              <p className="text-body-sm text-text-secondary">
                End-of-day analysis on what moved, what it means for your
                organization, and what to prepare for tomorrow.
              </p>
            </div>
          </div>
        </section>
      </FadeUp>

      {/* Who Reads Us */}
      <FadeUp delay={0.1}>
        <section className="mt-16">
          <OverlineLabel className="mb-4 block">Who Reads Us</OverlineLabel>
          <h2 className="font-display text-display-lg text-text-primary mb-6">
            Built for executives who build.
          </h2>
          <p className="text-body-md text-text-secondary mb-6 max-w-prose">
            Our readers are CEOs, CTOs, COOs, and senior operators at companies
            deploying AI — not just observing it. Many read in a second language,
            so we write with clarity as a first principle: short sentences, active
            voice, concrete examples.
          </p>
        </section>
      </FadeUp>

      {/* Contact */}
      <FadeUp delay={0.15}>
        <section className="mt-16 bg-bg-container border border-border-ghost rounded-lg p-8">
          <OverlineLabel className="mb-4 block">Contact</OverlineLabel>
          <h2 className="font-display text-display-lg text-text-primary mb-4">
            Get in touch
          </h2>
          <p className="text-body-md text-text-secondary">
            For press inquiries, partnerships, or feedback:{" "}
            <a
              href="mailto:hello@theparticlepost.com"
              className="text-accent hover:text-accent-hover transition-colors"
            >
              hello@theparticlepost.com
            </a>
          </p>
        </section>
      </FadeUp>
    </div>
  );
}
