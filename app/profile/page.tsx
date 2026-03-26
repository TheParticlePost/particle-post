import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileView } from "@/components/profile/profile-view";

export const metadata = {
  title: "Profile — Particle Post",
  description: "View your Particle Post profile.",
};

export default async function ProfilePage() {
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
      <ProfileView profile={profileData} />
    </main>
  );
}
