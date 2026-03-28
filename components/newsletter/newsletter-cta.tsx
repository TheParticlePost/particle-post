import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { OverlineLabel } from "@/components/ui/overline-label";

export function NewsletterCta() {
  return (
    <section id="newsletter-cta" className="relative overflow-hidden rounded-lg border border-border-ghost p-8 sm:p-12 my-16 bg-bg-container">
      <div className="relative max-w-lg mx-auto">
        <OverlineLabel className="mb-3 block">Newsletter</OverlineLabel>
        <h2 className="font-display text-display-md text-text-primary mb-3">
          Stay ahead of the curve
        </h2>
        <p className="text-text-secondary text-body-md mb-6">
          Get the latest insights on AI, finance, and enterprise tech delivered
          to your inbox. No spam.
        </p>
        <SubscribeForm />
        <p className="font-mono text-caption text-text-muted mt-3 uppercase tracking-wide">
          Unsubscribe at any time. We respect your privacy.
        </p>
      </div>
    </section>
  );
}
