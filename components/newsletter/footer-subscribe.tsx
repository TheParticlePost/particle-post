import { SubscribeForm } from "@/components/newsletter/subscribe-form";

export function FooterSubscribe() {
  return (
    <div className="space-y-3">
      <h4 className="text-body-xs font-semibold uppercase tracking-widest text-foreground-muted">
        Newsletter
      </h4>
      <p className="text-body-sm text-foreground-secondary">
        Weekly insights, no spam.
      </p>
      <SubscribeForm compact />
    </div>
  );
}
