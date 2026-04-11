import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { OverlineLabel } from "@/components/ui/overline-label";

/**
 * Compact above-the-fold variant of NewsletterCta. Renders on article pages
 * between the cover image and the 3-column body, so a finance executive
 * sees a conversion path before scrolling into the article body.
 *
 * Visually distinct from the full <NewsletterCta /> at the bottom of the
 * article so the two don't read as a duplicate. Uses a slim horizontal
 * layout with the SubscribeForm sharing space with a single short pitch
 * line.
 *
 * Reuses <SubscribeForm /> for the actual form so all subscribe handling,
 * validation, and post-submit state stays in one place.
 */
export function InlineNewsletterCta() {
  return (
    <section
      aria-label="Subscribe to the daily briefing"
      className="max-w-[760px] mx-auto mb-10 border-y border-border-ghost py-6 px-4 sm:px-6 bg-bg-container/40"
    >
      <div className="flex flex-col md:flex-row md:items-center md:gap-8 gap-4">
        <div className="flex-shrink-0 md:max-w-[300px]">
          <OverlineLabel className="mb-1 block">Daily AI Briefing</OverlineLabel>
          <p className="font-display text-display-sm text-text-primary leading-snug">
            Read by leaders before markets open.
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <SubscribeForm />
        </div>
      </div>
    </section>
  );
}
