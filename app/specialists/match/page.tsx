import type { Metadata } from "next";
import { OverlineLabel } from "@/components/ui/overline-label";
import { ProjectBriefForm } from "@/components/specialists/project-brief-form";

export const metadata: Metadata = {
  title: "Find a Specialist | The Particle Post",
  description:
    "Describe your AI project and we will match you with the best specialists from our vetted directory.",
};

export default function MatchPage() {
  return (
    <div className="max-w-container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-article mx-auto mb-10">
        <OverlineLabel>Automatch</OverlineLabel>
        <h1 className="font-display font-bold text-display-xl text-text-primary mt-3">
          Find the right specialist
        </h1>
        <p className="text-body-lg text-text-secondary mt-3">
          Tell us about your project and we will match you with pre-vetted AI
          specialists ranked by expertise, availability, and location.
        </p>
      </div>
      <ProjectBriefForm />
    </div>
  );
}
