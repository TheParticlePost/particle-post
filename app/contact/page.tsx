import type { Metadata } from "next";
import { OverlineLabel } from "@/components/ui/overline-label";
import { FadeUp } from "@/components/effects/fade-up";
import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Particle Post — press enquiries, partnerships, privacy requests, or feedback.",
};

const CONTACT_REASONS: Array<{ label: string; description: string; email: string }> = [
  {
    label: "Press & partnerships",
    description:
      "Media enquiries, interview requests, or partnership conversations.",
    email: CONTACT_EMAIL,
  },
  {
    label: "Editorial feedback",
    description:
      "Spot a factual error or have a suggestion for a future piece? We read every email.",
    email: CONTACT_EMAIL,
  },
  {
    label: "Privacy requests",
    description:
      "Data access, rectification, deletion, or any other right described in our Privacy Policy.",
    email: CONTACT_EMAIL,
  },
  {
    label: "Specialist directory",
    description:
      "Questions about applying to be listed in the AI Specialist Directory.",
    email: CONTACT_EMAIL,
  },
];

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <FadeUp>
        <OverlineLabel className="mb-4 block">Contact</OverlineLabel>
        <h1 className="font-display text-display-xl text-text-primary mb-4">
          Get in touch
        </h1>
        <p className="text-body-lg text-text-secondary mb-12 max-w-prose">
          The fastest way to reach us is by email. We aim to respond within
          two business days, and within five at the outside.
        </p>
      </FadeUp>

      <FadeUp delay={0.05}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {CONTACT_REASONS.map((reason) => (
            <div
              key={reason.label}
              className="bg-bg-container border border-border-ghost rounded-lg p-6"
            >
              <OverlineLabel className="mb-2 block">
                {reason.label}
              </OverlineLabel>
              <p className="text-body-sm text-text-secondary mb-4">
                {reason.description}
              </p>
              <a
                href={`mailto:${reason.email}`}
                className="font-mono text-data text-accent hover:text-accent-hover transition-colors"
              >
                {reason.email}
              </a>
            </div>
          ))}
        </div>
      </FadeUp>

      <FadeUp delay={0.1}>
        <div className="bg-bg-deep border border-border-ghost rounded-lg p-8">
          <OverlineLabel className="mb-3 block">For everything else</OverlineLabel>
          <p className="text-body-md text-text-secondary mb-3">
            Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-accent hover:text-accent-hover transition-colors"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            and we&rsquo;ll route it to the right person.
          </p>
        </div>
      </FadeUp>
    </div>
  );
}
