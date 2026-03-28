import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/profile/settings-form";

export const metadata = {
  title: "Settings — Particle Post",
  description: "Manage your account settings.",
};

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, role, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const profileData = profile ?? {
    id: user.id,
    email: user.email ?? "",
    full_name: user.user_metadata?.full_name ?? null,
    avatar_url: user.user_metadata?.avatar_url ?? null,
    role: "user",
    created_at: user.created_at,
  };

  return (
    <main className="container-content py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-display-sm font-bold text-text-primary">Settings</h1>
          <p className="text-body-md text-text-secondary mt-1">
            Manage your account and preferences.
          </p>
        </div>
        <SettingsForm profile={profileData} />
      </div>
    </main>
  );
}
