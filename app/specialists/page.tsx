import type { Metadata } from "next";
import { SpecialistHero } from "@/components/specialists/specialist-hero";
import { DirectoryContent } from "@/components/specialists/directory-content";
import { SpecialistsComingSoon } from "@/components/specialists/specialists-coming-soon";
import { getApprovedSpecialists } from "@/lib/specialists/queries";
import { verifyAdminServer } from "@/lib/api-auth";

export const metadata: Metadata = {
  title: "AI Specialist Directory | The Particle Post",
  description:
    "Find pre-vetted AI consultants, engineers, and agencies trusted by the executives who read The Particle Post.",
};

export default async function SpecialistsPage() {
  // Gate the directory behind admin role until it's populated. Non-admin
  // visitors see the Coming Soon page (which keeps the registration CTA
  // visible so the application funnel still works pre-launch). Admins see
  // the real directory — the seed migration `009_seed_specialist.sql`
  // inserts one demo row attached to the first admin profile so admins
  // have something to preview.
  const isAdmin = await verifyAdminServer();

  if (!isAdmin) {
    return <SpecialistsComingSoon />;
  }

  const { specialists, total } = await getApprovedSpecialists({ limit: 12 });

  return (
    <>
      <SpecialistHero />
      <section className="max-w-container mx-auto px-4 md:px-6 pb-16">
        <DirectoryContent
          initialSpecialists={specialists}
          initialTotal={total}
        />
      </section>
    </>
  );
}
