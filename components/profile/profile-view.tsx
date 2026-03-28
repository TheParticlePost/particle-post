import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";

interface ProfileViewProps {
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    created_at: string;
  };
}

function getInitials(fullName?: string | null, email?: string): string {
  if (fullName && fullName.trim()) {
    return fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? "?").toUpperCase();
}

export function ProfileView({ profile }: ProfileViewProps) {
  const initials = getInitials(profile.full_name, profile.email);
  const isAdmin = profile.role === "admin";

  return (
    <section className="max-w-lg mx-auto">
      <div className="bg-bg-container border border-border-ghost rounded-lg p-8">
        <div className="flex flex-col items-center text-center gap-4">
          {/* Avatar */}
          <div
            className={cn(
              "w-24 h-24 rounded-full overflow-hidden flex items-center justify-center",
              "border-2 border-border-ghost"
            )}
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name ?? "User avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="flex items-center justify-center w-full h-full bg-accent text-[#0a0a0f] font-bold text-display-sm">
                {initials}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="text-display-sm font-bold text-text-primary">
            {profile.full_name || "Anonymous User"}
          </h1>

          {/* Email */}
          <p className="text-body-md text-text-secondary">
            {profile.email}
          </p>

          {/* Role badge */}
          <span
            className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-body-xs font-medium",
              isAdmin
                ? "bg-accent/15 text-accent border border-accent/30"
                : "bg-bg-high/50 text-text-secondary border border-border-ghost"
            )}
          >
            {isAdmin ? "Admin" : "User"}
          </span>

          {/* Member since */}
          <p className="text-body-sm text-text-muted">
            Member since {formatDate(profile.created_at)}
          </p>

          {/* Edit button */}
          <Link href="/settings" className="mt-2">
            <Button variant="secondary" size="default">
              Edit Profile
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
