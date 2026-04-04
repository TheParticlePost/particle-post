import type { Metadata } from "next";
import { SpecialistHero } from "@/components/specialists/specialist-hero";
import { DirectoryContent } from "@/components/specialists/directory-content";
import { getApprovedSpecialists } from "@/lib/specialists/queries";

export const metadata: Metadata = {
  title: "AI Specialist Directory | The Particle Post",
  description:
    "Find pre-vetted AI consultants, engineers, and agencies trusted by the executives who read The Particle Post.",
};

export default async function SpecialistsPage() {
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
