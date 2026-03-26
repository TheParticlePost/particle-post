import { SubscribeForm } from "@/components/newsletter/subscribe-form";

export function NewsletterCta() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] p-8 sm:p-12 my-16">
      {/* Background mesh */}
      <div className="absolute inset-0 mesh-gradient opacity-50" />

      <div className="relative text-center max-w-lg mx-auto">
        <p className="text-body-xs font-mono text-accent uppercase tracking-widest mb-3">
          Newsletter
        </p>
        <h2 className="font-display text-display-md mb-3">
          Stay ahead of the curve
        </h2>
        <p className="text-foreground-secondary text-body-md mb-6">
          Get the latest insights on AI, finance, and enterprise tech delivered
          to your inbox. No spam.
        </p>
        <SubscribeForm />
        <p className="text-body-xs text-foreground-muted mt-3">
          Unsubscribe at any time. We respect your privacy.
        </p>
      </div>
    </section>
  );
}
