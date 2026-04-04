import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getSpecialistBySlug,
  getPortfolioItems,
  getApprovedReviews,
} from "@/lib/specialists/queries";
import { SpecialistProfileView } from "@/components/specialists/specialist-profile-view";
import { getCategoryLabel, getCountryLabel } from "@/lib/specialists/constants";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const specialist = await getSpecialistBySlug(slug);

  if (!specialist) {
    return { title: "Specialist Not Found | The Particle Post" };
  }

  const categoryLabel = specialist.categories[0]
    ? getCategoryLabel(specialist.categories[0])
    : "AI Specialist";

  return {
    title: `${specialist.display_name} — ${categoryLabel} | The Particle Post`,
    description: specialist.headline,
    openGraph: {
      title: `${specialist.display_name} — ${categoryLabel}`,
      description: specialist.headline,
    },
  };
}

export default async function SpecialistProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const specialist = await getSpecialistBySlug(slug);

  if (!specialist) {
    notFound();
  }

  const [portfolio, reviews] = await Promise.all([
    getPortfolioItems(specialist.id),
    getApprovedReviews(specialist.id),
  ]);

  return (
    <SpecialistProfileView
      specialist={specialist}
      portfolio={portfolio}
      reviews={reviews}
    />
  );
}
