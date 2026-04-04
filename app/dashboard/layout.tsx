import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Specialist Dashboard",
  robots: { index: false, follow: false },
};

const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: "Leads",
    href: "/dashboard/leads",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const { data: specialist } = await supabase
    .from("specialists")
    .select("display_name, slug, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!specialist || specialist.status !== "approved") {
    redirect("/specialists/register");
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg-base">
      {/* Mobile top nav */}
      <nav
        className={cn(
          "lg:hidden flex items-center gap-1 px-4 py-3 overflow-x-auto scrollbar-hide",
          "border-b border-border-ghost",
          "bg-bg-low"
        )}
      >
        <span className="font-display text-body-md text-accent mr-3 shrink-0">
          Dashboard
        </span>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 px-3 py-1.5 text-body-sm text-text-secondary hover:text-text-primary rounded-lg hover:bg-bg-high/50 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0",
          "border-r border-border-ghost bg-bg-low",
          "h-[calc(100vh-4rem)] sticky top-16"
        )}
      >
        <div className="p-4 border-b border-border-ghost">
          <span className="font-display text-body-md font-bold text-accent">
            Dashboard
          </span>
          <p className="text-caption text-text-muted mt-0.5 truncate">
            {specialist.display_name}
          </p>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg",
                "text-body-sm text-text-secondary",
                "hover:text-text-primary hover:bg-bg-high/50",
                "transition-colors duration-150 ease-kinetic"
              )}
            >
              <span className="text-text-muted">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border-ghost">
          <Link
            href={`/specialists/${specialist.slug}/`}
            className="text-body-sm text-text-muted hover:text-accent transition-colors"
          >
            View public profile
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
