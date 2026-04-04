import Link from "next/link";
import { OverlineLabel } from "@/components/ui/overline-label";
import { Button } from "@/components/ui/button";

export function SpecialistHero() {
  return (
    <section className="pt-12 pb-10">
      <div className="max-w-container mx-auto px-4 md:px-6">
        <OverlineLabel>AI Specialist Directory</OverlineLabel>
        <h1 className="font-display font-bold text-display-xl text-text-primary mt-3">
          Find AI specialists your CFO would approve
        </h1>
        <p className="text-body-lg text-text-secondary mt-3 max-w-[600px]">
          Pre-vetted consultants, engineers, and agencies trusted by the
          executives who read The Particle Post.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link href="/specialists/match/">
            <Button variant="primary" size="compact">
              Find a Specialist
            </Button>
          </Link>
          <Link href="/specialists/register/">
            <Button variant="secondary" size="compact">
              List Your Practice
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
