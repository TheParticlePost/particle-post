import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSpecialistForUser } from "@/lib/specialists/queries";
import { OverlineLabel } from "@/components/ui/overline-label";
import { RegistrationForm } from "@/components/specialists/registration-form";

export const metadata: Metadata = {
  title: "Register as a Specialist | The Particle Post",
  description:
    "List your AI consulting practice in The Particle Post specialist directory.",
};

export default async function SpecialistRegisterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/specialists/register");
  }

  // Check if user already has a specialist profile
  const existing = await getSpecialistForUser(user.id);
  if (existing) {
    redirect(`/specialists/${existing.slug}/`);
  }

  return (
    <div className="max-w-container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-article mx-auto mb-10">
        <OverlineLabel>Join the Directory</OverlineLabel>
        <h1 className="font-display font-bold text-display-xl text-text-primary mt-3">
          List your AI practice
        </h1>
        <p className="text-body-lg text-text-secondary mt-3">
          Get discovered by the executives and finance leaders who read
          The Particle Post. Fill out your profile below to apply.
        </p>
      </div>
      <RegistrationForm />
    </div>
  );
}
