import Link from "next/link";
import { OverlineLabel } from "@/components/ui/overline-label";
import { Button } from "@/components/ui/button";

/**
 * Public-facing "Coming Soon" view of the Specialist Directory.
 *
 * Renders for non-admin visitors while the directory is being populated.
 * The Apply CTA must remain visible — it's the entire point of this page
 * during the pre-launch phase: collect specialist profiles so the directory
 * has real entries on day one.
 *
 * Admins (profiles.role = 'admin') see the real DirectoryContent component
 * instead, gated in app/specialists/page.tsx via verifyAdminServer().
 */
export function SpecialistsComingSoon() {
  return (
    <section className="pt-12 pb-24">
      <div className="max-w-container mx-auto px-4 md:px-6">
        <OverlineLabel>Coming Soon</OverlineLabel>
        <h1 className="font-display font-bold text-display-xl text-text-primary mt-3 max-w-[720px]">
          A vetted directory of AI specialists is on the way.
        </h1>
        <p className="text-body-lg text-text-secondary mt-4 max-w-[640px]">
          We&rsquo;re building a directory of consultants, engineers, and
          agencies trusted by the executives who read Particle Post — so you
          can find the right partner instead of the loudest one. Specialists
          can apply now to be included at launch.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-start gap-3">
          <Link href="/specialists/register/">
            <Button variant="primary" size="compact">
              Apply to be listed →
            </Button>
          </Link>
          <Link href="/subscribe/">
            <Button variant="secondary" size="compact">
              Get notified at launch
            </Button>
          </Link>
        </div>

        {/* Trust strip — what we evaluate, no fake stats */}
        <div className="mt-16 max-w-[720px]">
          <OverlineLabel>How we vet</OverlineLabel>
          <ul className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-body-sm text-text-secondary">
            <li>
              <span className="text-text-primary font-semibold">
                Verified delivery
              </span>
              <br />
              At least one named client outcome with measurable impact.
            </li>
            <li>
              <span className="text-text-primary font-semibold">
                Domain depth
              </span>
              <br />
              Documented expertise in a specific category — not generalists.
            </li>
            <li>
              <span className="text-text-primary font-semibold">
                Real availability
              </span>
              <br />
              Active practice taking on new engagements this quarter.
            </li>
            <li>
              <span className="text-text-primary font-semibold">
                Editorial review
              </span>
              <br />
              Profile vetted by Particle Post editors before going live.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
